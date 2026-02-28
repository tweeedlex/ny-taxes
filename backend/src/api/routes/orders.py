import asyncio
import json
import logging
from datetime import date, datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import AsyncIterator, Literal
from uuid import uuid4

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    WebSocketException,
    status,
)
from fastapi.responses import StreamingResponse
from pydantic import ValidationError
from tortoise.functions import Count, Sum

from src.api.deps import (
    get_reporting_code_service,
    get_storage,
    get_tax_rate_service,
    require_authority,
    require_websocket_authority,
)
from src.core.authorities import EDIT_ORDERS, READ_ORDERS
from src.core.date_rules import ensure_min_supported_date, ensure_min_supported_datetime
from src.core.reporting_code import normalize_reporting_code
from src.core.storage import MinioStorage
from src.models.file_task import FileTask
from src.models.order import Order
from src.models.user import User
from src.schemas.order import (
    FileTaskRead,
    OrderCreateRequest,
    OrderImportTaskCreateResponse,
    OrdersListResponse,
    OrdersStatsResponse,
    OrdersStatsSummaryResponse,
    OrderTaxCalculationResponse,
)
from src.services.orders import (
    FILE_TASK_STATUS_IN_PROGRESS,
    build_datetime_range,
    build_orders_stats_response,
    compute_order_values,
    count_csv_rows,
    parse_stats_date_param,
    process_import_task,
    resume_in_progress_import_tasks,
    to_file_task_read,
    to_order_read,
    to_order_tax_calculation_response,
    to_order_tax_preview_response,
)
from src.services.tax import ReportingCodeByCoordinatesService, TaxRateByReportingCodeService

router = APIRouter(prefix="/orders", tags=["orders"])
logger = logging.getLogger(__name__)

OrdersSortType = Literal[
    "newest",
    "oldest",
    "subtotal_asc",
    "subtotal_desc",
    "tax_asc",
    "tax_desc",
]

ORDERS_SORT_MAPPING: dict[OrdersSortType, tuple[str, ...]] = {
    "newest": ("-timestamp", "-id"),
    "oldest": ("timestamp", "id"),
    "subtotal_asc": ("subtotal", "id"),
    "subtotal_desc": ("-subtotal", "-id"),
    "tax_asc": ("tax_amount", "id"),
    "tax_desc": ("-tax_amount", "-id"),
}
IMPORT_TASKS_WS_INTERVAL_SECONDS = 0.3
ORDERS_STREAM_CHUNK_SIZE = 1000


def _apply_orders_query_filters(
    query,
    reporting_code: str | None,
    timestamp_from: datetime | None,
    timestamp_to: datetime | None,
    subtotal_min: Decimal | None,
    subtotal_max: Decimal | None,
):
    if reporting_code is not None:
        try:
            normalized_reporting_code = normalize_reporting_code(reporting_code)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc
        query = query.filter(reporting_code=normalized_reporting_code)

    if timestamp_from is not None:
        try:
            ensure_min_supported_datetime(timestamp_from, "timestamp_from")
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc
        query = query.filter(timestamp__gte=timestamp_from)

    if timestamp_to is not None:
        try:
            ensure_min_supported_datetime(timestamp_to, "timestamp_to")
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc
        query = query.filter(timestamp__lte=timestamp_to)

    if subtotal_min is not None and subtotal_max is not None and subtotal_min > subtotal_max:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="subtotal_min cannot be greater than subtotal_max",
        )

    if subtotal_min is not None:
        query = query.filter(subtotal__gte=subtotal_min)

    if subtotal_max is not None:
        query = query.filter(subtotal__lte=subtotal_max)

    return query


async def _stream_order_coordinates_ndjson(query) -> AsyncIterator[str]:
    last_id = 0
    while True:
        rows = await query.filter(id__gt=last_id).order_by("id").limit(
            ORDERS_STREAM_CHUNK_SIZE
        ).values("id", "latitude", "longitude")
        if not rows:
            return

        for row in rows:
            last_id = int(row["id"])
            yield json.dumps(
                {
                    "lat": float(row["latitude"]),
                    "lon": float(row["longitude"]),
                },
                separators=(",", ":"),
            ) + "\n"


@router.post("", response_model=OrderTaxCalculationResponse)
async def calculate_order_tax(
    payload: OrderCreateRequest,
    current_user: User = Depends(require_authority(EDIT_ORDERS)),
    reporting_code_service: ReportingCodeByCoordinatesService = Depends(
        get_reporting_code_service
    ),
    tax_rate_service: TaxRateByReportingCodeService = Depends(get_tax_rate_service),
) -> OrderTaxCalculationResponse:
    try:
        computed = compute_order_values(
            latitude=payload.latitude,
            longitude=payload.longitude,
            timestamp=payload.timestamp,
            subtotal_raw=payload.subtotal,
            reporting_code_service=reporting_code_service,
            tax_rate_service=tax_rate_service,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except LookupError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    order = await Order.create(user=current_user, **computed)
    return to_order_tax_calculation_response(
        order=order,
        author_login=current_user.login,
        computed=computed,
    )


@router.post("/import", response_model=OrderImportTaskCreateResponse)
async def import_orders_csv(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(require_authority(EDIT_ORDERS)),
    storage: MinioStorage = Depends(get_storage),
    reporting_code_service: ReportingCodeByCoordinatesService = Depends(
        get_reporting_code_service
    ),
    tax_rate_service: TaxRateByReportingCodeService = Depends(get_tax_rate_service),
) -> OrderImportTaskCreateResponse:
    filename = file.filename or "orders.csv"
    object_name = f"imports/{datetime.utcnow().strftime('%Y%m%d')}/{uuid4().hex}_{filename}"
    content = await file.read()
    total_rows = count_csv_rows(content)

    await asyncio.to_thread(
        storage.upload_bytes,
        object_name,
        content,
        file.content_type or "text/csv",
    )

    task = await FileTask.create(
        user=current_user,
        file_path=storage.object_url(object_name),
        total_rows=total_rows,
        successful_rows=0,
        failed_rows=0,
        status=FILE_TASK_STATUS_IN_PROGRESS,
    )

    background_tasks.add_task(
        process_import_task,
        task.id,
        storage,
        reporting_code_service,
        tax_rate_service,
        None,
        request.app.state.redis_client,
    )
    return OrderImportTaskCreateResponse(task=to_file_task_read(task))


@router.get("", response_model=OrdersListResponse)
async def list_orders(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    reporting_code: str | None = Query(default=None, min_length=1, max_length=32),
    timestamp_from: datetime | None = Query(default=None),
    timestamp_to: datetime | None = Query(default=None),
    subtotal_min: Decimal | None = Query(default=None, ge=Decimal("0.00")),
    subtotal_max: Decimal | None = Query(default=None, ge=Decimal("0.00")),
    sort: OrdersSortType = Query(default="newest"),
    _: User = Depends(require_authority(READ_ORDERS)),
) -> OrdersListResponse:
    query = _apply_orders_query_filters(
        query=Order.all().prefetch_related("user"),
        reporting_code=reporting_code,
        timestamp_from=timestamp_from,
        timestamp_to=timestamp_to,
        subtotal_min=subtotal_min,
        subtotal_max=subtotal_max,
    )

    total = await query.count()
    sort_fields = ORDERS_SORT_MAPPING[sort]
    orders = await query.order_by(*sort_fields).offset(offset).limit(limit)

    return OrdersListResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=[to_order_read(order) for order in orders],
    )


@router.get("/stream/coordinates")
async def stream_order_coordinates(
    reporting_code: str | None = Query(default=None, min_length=1, max_length=32),
    timestamp_from: datetime | None = Query(default=None),
    timestamp_to: datetime | None = Query(default=None),
    subtotal_min: Decimal | None = Query(default=None, ge=Decimal("0.00")),
    subtotal_max: Decimal | None = Query(default=None, ge=Decimal("0.00")),
    _: User = Depends(require_authority(READ_ORDERS)),
) -> StreamingResponse:
    query = _apply_orders_query_filters(
        query=Order.all(),
        reporting_code=reporting_code,
        timestamp_from=timestamp_from,
        timestamp_to=timestamp_to,
        subtotal_min=subtotal_min,
        subtotal_max=subtotal_max,
    )
    return StreamingResponse(
        _stream_order_coordinates_ndjson(query),
        media_type="application/x-ndjson",
    )


@router.get("/stats", response_model=OrdersStatsSummaryResponse)
async def orders_stats(
    from_: date | None = Query(default=None, alias="from"),
    to_: date | None = Query(default=None, alias="to"),
    from_date: str | None = Query(
        default=None,
        description="Deprecated. Format: YYYY.MM.DD",
    ),
    to_date: str | None = Query(
        default=None,
        description="Deprecated. Format: YYYY.MM.DD",
    ),
    _: User = Depends(require_authority(READ_ORDERS)),
) -> OrdersStatsSummaryResponse:
    try:
        start_date = from_
        end_date = to_
        if start_date is None and from_date is not None:
            start_date = parse_stats_date_param(name="from_date", value=from_date)
        if end_date is None and to_date is not None:
            end_date = parse_stats_date_param(name="to_date", value=to_date)

        if start_date is not None:
            ensure_min_supported_date(start_date, "from")
        if end_date is not None:
            ensure_min_supported_date(end_date, "to")
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if start_date is not None and end_date is not None and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="from cannot be greater than to",
        )

    query = Order.all()
    if start_date is not None:
        query = query.filter(timestamp__gte=datetime.combine(start_date, time.min))
    if end_date is not None:
        query = query.filter(
            timestamp__lt=datetime.combine(end_date + timedelta(days=1), time.min)
        )

    aggregate_rows = await query.annotate(
        total_orders=Count("id"),
        total_revenue=Sum("subtotal"),
        total_tax=Sum("tax_amount"),
    ).values("total_orders", "total_revenue", "total_tax")

    row = aggregate_rows[0] if aggregate_rows else {}
    total_orders = int(row.get("total_orders") or 0)
    total_revenue = Decimal(str(row.get("total_revenue") or "0"))
    total_tax = Decimal(str(row.get("total_tax") or "0"))
    average_tax_percent = Decimal("0")
    if total_revenue > 0:
        average_tax_percent = (total_tax / total_revenue) * Decimal("100")

    return OrdersStatsSummaryResponse(
        total_orders=total_orders,
        total_revenue=float(
            total_revenue.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        ),
        total_tax=float(total_tax.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        average_tax_percent=float(
            average_tax_percent.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        ),
    )


@router.get("/stats/daily", response_model=OrdersStatsResponse)
async def orders_stats_daily(
    from_date: str = Query(..., description="Format: YYYY.MM.DD"),
    to_date: str = Query(..., description="Format: YYYY.MM.DD"),
    _: User = Depends(require_authority(READ_ORDERS)),
) -> OrdersStatsResponse:
    try:
        start_date = parse_stats_date_param(name="from_date", value=from_date)
        end_date = parse_stats_date_param(name="to_date", value=to_date)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="from_date cannot be greater than to_date",
        )

    start_dt, end_dt_exclusive = build_datetime_range(start_date, end_date)
    orders = await Order.filter(timestamp__gte=start_dt, timestamp__lt=end_dt_exclusive).all()
    return build_orders_stats_response(start_date=start_date, end_date=end_date, orders=orders)


@router.get("/import/tasks", response_model=list[FileTaskRead])
async def list_import_tasks(
    _: User = Depends(require_authority(READ_ORDERS)),
) -> list[FileTaskRead]:
    tasks = await FileTask.all().order_by("-id")
    return [to_file_task_read(task) for task in tasks]


@router.websocket("/import/tasks/ws")
async def import_tasks_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        await require_websocket_authority(websocket, READ_ORDERS)
        while True:
            tasks = await FileTask.all().order_by("-id")
            payload = [to_file_task_read(task).model_dump(mode="json") for task in tasks]
            await websocket.send_json({"tasks": payload})
            await asyncio.sleep(IMPORT_TASKS_WS_INTERVAL_SECONDS)
    except WebSocketDisconnect:
        return
    except WebSocketException as exc:
        await websocket.close(code=exc.code, reason=exc.reason)


@router.websocket("/tax/ws")
async def tax_preview_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    reporting_code_service = websocket.app.state.reporting_code_service
    tax_rate_service = websocket.app.state.tax_rate_service

    try:
        while True:
            try:
                payload_raw = await websocket.receive_json()
            except ValueError:
                await websocket.send_json(
                    {
                        "ok": False,
                        "error": {
                            "code": "invalid_json",
                            "detail": "Payload must be valid JSON object.",
                        },
                    }
                )
                continue

            try:
                payload = OrderCreateRequest.model_validate(payload_raw)
            except ValidationError as exc:
                await websocket.send_json(
                    {
                        "ok": False,
                        "error": {
                            "code": "validation_error",
                            "detail": "Payload validation failed.",
                            "fields": json.loads(exc.json()),
                        },
                    }
                )
                continue

            try:
                computed = compute_order_values(
                    latitude=payload.latitude,
                    longitude=payload.longitude,
                    timestamp=payload.timestamp,
                    subtotal_raw=payload.subtotal,
                    reporting_code_service=reporting_code_service,
                    tax_rate_service=tax_rate_service,
                )
            except ValueError as exc:
                await websocket.send_json(
                    {
                        "ok": False,
                        "error": {
                            "code": "outside_coverage",
                            "detail": str(exc),
                        },
                    }
                )
                continue
            except LookupError as exc:
                await websocket.send_json(
                    {
                        "ok": False,
                        "error": {
                            "code": "tax_rate_not_found",
                            "detail": str(exc),
                        },
                    }
                )
                continue
            except Exception:
                logger.exception("Tax preview websocket unexpected error")
                await websocket.send_json(
                    {
                        "ok": False,
                        "error": {
                            "code": "internal_error",
                            "detail": "Unexpected server error.",
                        },
                    }
                )
                continue

            await websocket.send_json(
                {
                    "ok": True,
                    "result": to_order_tax_preview_response(computed).model_dump(mode="json"),
                }
            )
    except WebSocketDisconnect:
        return
