import asyncio
import csv
import io
import logging
from datetime import date, datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP
from urllib.parse import unquote, urlsplit
from uuid import uuid4

from pydantic import ValidationError
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    WebSocketException,
    status,
)

from src.core.authorities import EDIT_ORDERS, READ_ORDERS
from src.core.storage import MinioStorage
from src.models.file_task import FileTask
from src.models.order import Order
from src.models.user import User
from src.services import TaxRateByReportingCodeService, ReportingCodeByCoordinatesService
from src.schemas.order import (
    FileTaskRead,
    OrderCreateRequest,
    OrderImportTaskCreateResponse,
    OrderRead,
    OrdersListResponse,
    OrdersStatsDay,
    OrdersStatsResponse,
    OrderTaxCalculationResponse,
    OrderTaxPreviewResponse,
    TaxBreakdownResponse,
)
from src.api.deps import (
    get_storage,
    get_tax_rate_service,
    get_reporting_code_service,
    require_authority,
    require_websocket_authority,
)

router = APIRouter(prefix="/orders", tags=["orders"])
logger = logging.getLogger(__name__)
FILE_TASK_STATUS_IN_PROGRESS = "in_progress"
FILE_TASK_STATUS_COMPLETED = "completed"
PARALLEL_IMPORT_THRESHOLD = 100
PARALLEL_IMPORT_CHUNKS = 5
IMPORT_BULK_INSERT_BATCH_SIZE = 500
IMPORT_COMPUTE_BATCH_SIZE = 1000
OrderComputedPayload = dict[
    str, Decimal | float | datetime | str | dict[str, list[dict[str, str | float]]]
]


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
        computed = _compute_order_values(
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

    jurisdictions = computed.get("jurisdictions")
    if not isinstance(jurisdictions, dict):
        jurisdictions = {}

    return OrderTaxCalculationResponse(
        order_id=order.id,
        author_user_id=order.user_id,
        author_login=current_user.login,
        reporting_code=str(computed["reporting_code"]),
        jurisdictions=jurisdictions,
        composite_tax_rate=float(computed["composite_tax_rate"]),
        tax_amount=float(computed["tax_amount"]),
        total_amount=float(computed["total_amount"]),
        breakdown=TaxBreakdownResponse(
            state_rate=float(computed["state_rate"]),
            county_rate=float(computed["county_rate"]),
            city_rate=float(computed["city_rate"]),
            special_rates=float(computed["special_rates"]),
        ),
    )


@router.post("/import", response_model=OrderImportTaskCreateResponse)
async def import_orders_csv(
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
    total_rows = _count_csv_rows(content)

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
        _process_import_task,
        task.id,
        storage,
        reporting_code_service,
        tax_rate_service,
        content,
    )
    return OrderImportTaskCreateResponse(task=_to_file_task_read(task))


@router.get("", response_model=OrdersListResponse)
async def list_orders(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    reporting_code: str | None = Query(default=None, min_length=1, max_length=32),
    timestamp_from: datetime | None = Query(default=None),
    timestamp_to: datetime | None = Query(default=None),
    subtotal_min: Decimal | None = Query(default=None, ge=Decimal("0.00")),
    subtotal_max: Decimal | None = Query(default=None, ge=Decimal("0.00")),
    _: User = Depends(require_authority(READ_ORDERS)),
) -> OrdersListResponse:
    query = Order.all().prefetch_related("user")

    if reporting_code is not None:
        query = query.filter(reporting_code=_normalize_reporting_code(reporting_code))

    if timestamp_from is not None:
        query = query.filter(timestamp__gte=timestamp_from)

    if timestamp_to is not None:
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

    total = await query.count()
    orders = await query.order_by("-id").offset(offset).limit(limit)

    return OrdersListResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=[_to_order_read(order) for order in orders],
    )


@router.get("/stats", response_model=OrdersStatsResponse)
async def orders_stats(
    from_date: str = Query(..., description="Format: YYYY.MM.DD"),
    to_date: str = Query(..., description="Format: YYYY.MM.DD"),
    _: User = Depends(require_authority(READ_ORDERS)),
) -> OrdersStatsResponse:
    start_date = _parse_date_param(name="from_date", value=from_date)
    end_date = _parse_date_param(name="to_date", value=to_date)
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="from_date cannot be greater than to_date",
        )

    start_dt = datetime.combine(start_date, time.min)
    end_dt_exclusive = datetime.combine(end_date + timedelta(days=1), time.min)
    orders = await Order.filter(timestamp__gte=start_dt, timestamp__lt=end_dt_exclusive).all()

    totals_by_day = {
        current: {
            "total_amount": Decimal("0.00"),
            "total_tax_amount": Decimal("0.00"),
            "total_orders": 0,
        }
        for current in _daterange(start_date, end_date)
    }

    total_amount = Decimal("0.00")
    total_tax_amount = Decimal("0.00")
    total_orders = 0

    for order in orders:
        day = order.timestamp.date()
        day_bucket = totals_by_day.get(day)
        if day_bucket is None:
            continue

        day_bucket["total_amount"] += Decimal(str(order.total_amount))
        day_bucket["total_tax_amount"] += Decimal(str(order.tax_amount))
        day_bucket["total_orders"] += 1

        total_amount += Decimal(str(order.total_amount))
        total_tax_amount += Decimal(str(order.tax_amount))
        total_orders += 1

    return OrdersStatsResponse(
        from_date=start_date.strftime("%Y.%m.%d"),
        to_date=end_date.strftime("%Y.%m.%d"),
        total_amount=float(total_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)),
        total_tax_amount=float(
            total_tax_amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        ),
        total_orders=total_orders,
        daily=[
            OrdersStatsDay(
                date=day.strftime("%Y.%m.%d"),
                total_amount=float(
                    payload["total_amount"].quantize(
                        Decimal("0.01"), rounding=ROUND_HALF_UP
                    )
                ),
                total_tax_amount=float(
                    payload["total_tax_amount"].quantize(
                        Decimal("0.01"), rounding=ROUND_HALF_UP
                    )
                ),
                total_orders=payload["total_orders"],
            )
            for day, payload in sorted(totals_by_day.items(), key=lambda item: item[0])
        ],
    )


@router.get("/import/tasks", response_model=list[FileTaskRead])
async def list_import_tasks(
    _: User = Depends(require_authority(READ_ORDERS)),
) -> list[FileTaskRead]:
    tasks = await FileTask.all().order_by("-id")
    return [_to_file_task_read(task) for task in tasks]


@router.websocket("/import/tasks/ws")
async def import_tasks_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        await require_websocket_authority(websocket, READ_ORDERS)
        while True:
            tasks = await FileTask.all().order_by("-id")
            payload = [_to_file_task_read(task).model_dump(mode="json") for task in tasks]
            await websocket.send_json({"tasks": payload})
            await asyncio.sleep(0.3)
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
                            "fields": exc.errors(),
                        },
                    }
                )
                continue

            try:
                computed = _compute_order_values(
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
                    "result": _to_order_tax_preview_response(computed).model_dump(
                        mode="json"
                    ),
                }
            )
    except WebSocketDisconnect:
        return


async def resume_in_progress_import_tasks(
    storage: MinioStorage,
    reporting_code_service: ReportingCodeByCoordinatesService,
    tax_rate_service: TaxRateByReportingCodeService,
) -> set[asyncio.Task]:
    workers: set[asyncio.Task] = set()
    tasks = await FileTask.filter(status=FILE_TASK_STATUS_IN_PROGRESS).all()
    for task in tasks:
        worker = asyncio.create_task(
            _process_import_task(
                task.id,
                storage,
                reporting_code_service,
                tax_rate_service,
            )
        )
        workers.add(worker)
    return workers


def _normalize_reporting_code(raw_reporting_code: str) -> str:
    normalized = raw_reporting_code.strip()
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="reporting_code cannot be empty",
        )
    if len(normalized) > 32:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="reporting_code must have at most 32 characters",
        )
    if normalized.isdigit() and len(normalized) <= 4:
        return normalized.zfill(4)
    return normalized


def _parse_date_param(name: str, value: str) -> date:
    try:
        return datetime.strptime(value, "%Y.%m.%d").date()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{name} must be in format YYYY.MM.DD",
        ) from exc


def _daterange(start_date: date, end_date: date) -> list[date]:
    days: list[date] = []
    current = start_date
    while current <= end_date:
        days.append(current)
        current += timedelta(days=1)
    return days


def _to_order_read(order: Order) -> OrderRead:
    author_login = None
    if getattr(order, "user", None) is not None:
        author_login = order.user.login
    return OrderRead(
        id=order.id,
        author_user_id=order.user_id,
        author_login=author_login,
        latitude=order.latitude,
        longitude=order.longitude,
        subtotal=float(order.subtotal),
        timestamp=order.timestamp,
        reporting_code=order.reporting_code,
        jurisdictions=order.jurisdictions or {},
        composite_tax_rate=float(order.composite_tax_rate),
        tax_amount=float(order.tax_amount),
        total_amount=float(order.total_amount),
        breakdown=TaxBreakdownResponse(
            state_rate=float(order.state_rate),
            county_rate=float(order.county_rate),
            city_rate=float(order.city_rate),
            special_rates=float(order.special_rates),
        ),
        created_at=order.created_at,
    )


def _to_order_tax_preview_response(
    computed: OrderComputedPayload,
) -> OrderTaxPreviewResponse:
    jurisdictions = computed.get("jurisdictions")
    if not isinstance(jurisdictions, dict):
        jurisdictions = {}

    return OrderTaxPreviewResponse(
        reporting_code=str(computed["reporting_code"]),
        jurisdictions=jurisdictions,
        composite_tax_rate=float(computed["composite_tax_rate"]),
        tax_amount=float(computed["tax_amount"]),
        total_amount=float(computed["total_amount"]),
        breakdown=TaxBreakdownResponse(
            state_rate=float(computed["state_rate"]),
            county_rate=float(computed["county_rate"]),
            city_rate=float(computed["city_rate"]),
            special_rates=float(computed["special_rates"]),
        ),
    )


def _to_file_task_read(task: FileTask) -> FileTaskRead:
    return FileTaskRead(
        id=task.id,
        user_id=task.user_id,
        file_path=task.file_path,
        total_rows=task.total_rows,
        successful_rows=task.successful_rows,
        failed_rows=task.failed_rows,
        status=task.status,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def _count_csv_rows(content: bytes) -> int:
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        return 0

    reader = csv.reader(io.StringIO(text))
    total = 0
    for _ in reader:
        total += 1
    if total == 0:
        return 0
    return max(total - 1, 0)


def _compute_order_values(
    latitude: float,
    longitude: float,
    timestamp: datetime,
    subtotal_raw: Decimal,
    reporting_code_service: ReportingCodeByCoordinatesService,
    tax_rate_service: TaxRateByReportingCodeService,
) -> OrderComputedPayload:
    reporting_code = reporting_code_service.get_reporting_code(lat=latitude, lon=longitude)
    if reporting_code is None:
        raise ValueError("Delivery point is outside New York State coverage.")

    rates = tax_rate_service.get_tax_rate_breakdown(reporting_code)
    if rates is None:
        raise LookupError(f"Tax rate not found for reporting code {reporting_code}.")

    subtotal = subtotal_raw.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    composite_tax_rate = Decimal(str(rates.composite_tax_rate)).quantize(
        Decimal("0.00001"),
        rounding=ROUND_HALF_UP,
    )
    tax_amount = (subtotal * composite_tax_rate).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )
    total_amount = (subtotal + tax_amount).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )
    state_rate = Decimal(str(rates.state_rate)).quantize(
        Decimal("0.00001"),
        rounding=ROUND_HALF_UP,
    )
    county_rate = Decimal(str(rates.county_rate)).quantize(
        Decimal("0.00001"),
        rounding=ROUND_HALF_UP,
    )
    city_rate = Decimal(str(rates.city_rate)).quantize(
        Decimal("0.00001"),
        rounding=ROUND_HALF_UP,
    )
    special_rates = Decimal(str(rates.special_rates)).quantize(
        Decimal("0.00001"),
        rounding=ROUND_HALF_UP,
    )

    return {
        "latitude": latitude,
        "longitude": longitude,
        "subtotal": subtotal,
        "timestamp": timestamp,
        "reporting_code": rates.reporting_code,
        "jurisdictions": rates.jurisdictions,
        "composite_tax_rate": composite_tax_rate,
        "tax_amount": tax_amount,
        "total_amount": total_amount,
        "state_rate": state_rate,
        "county_rate": county_rate,
        "city_rate": city_rate,
        "special_rates": special_rates,
    }


async def _process_import_task(
    task_id: int,
    storage: MinioStorage,
    reporting_code_service: ReportingCodeByCoordinatesService,
    tax_rate_service: TaxRateByReportingCodeService,
    source_content: bytes | None = None,
) -> None:
    task = await FileTask.get_or_none(id=task_id)
    if not task:
        return

    successful_rows = task.successful_rows
    failed_rows = task.failed_rows
    processed_rows = successful_rows + failed_rows
    pending_orders: list[Order] = []
    pending_failed_rows = 0
    object_name = _extract_object_name(file_path=task.file_path, bucket=storage.bucket)

    try:
        if source_content is None:
            content_bytes = await asyncio.to_thread(storage.get_object_bytes, object_name)
        else:
            content_bytes = source_content

        text = content_bytes.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        columns = _resolve_import_columns(reader.fieldnames)

        total_remaining_rows = max(task.total_rows - processed_rows, 0)
        use_parallel = total_remaining_rows > PARALLEL_IMPORT_THRESHOLD
        indexed_rows_batch: list[tuple[int, dict[str, str]]] = []

        for row_number, row in enumerate(reader, start=1):
            if row_number <= processed_rows:
                continue

            indexed_rows_batch.append((row_number, row))
            if len(indexed_rows_batch) < IMPORT_COMPUTE_BATCH_SIZE:
                continue

            (
                successful_rows,
                failed_rows,
                processed_rows,
                pending_orders,
                pending_failed_rows,
            ) = await _process_indexed_rows_batch(
                task_id=task_id,
                task_user_id=task.user_id,
                indexed_rows=indexed_rows_batch,
                columns=columns,
                use_parallel=use_parallel,
                reporting_code_service=reporting_code_service,
                tax_rate_service=tax_rate_service,
                successful_rows=successful_rows,
                failed_rows=failed_rows,
                pending_orders=pending_orders,
                pending_failed_rows=pending_failed_rows,
            )
            indexed_rows_batch = []

        if indexed_rows_batch:
            (
                successful_rows,
                failed_rows,
                processed_rows,
                pending_orders,
                pending_failed_rows,
            ) = await _process_indexed_rows_batch(
                task_id=task_id,
                task_user_id=task.user_id,
                indexed_rows=indexed_rows_batch,
                columns=columns,
                use_parallel=use_parallel,
                reporting_code_service=reporting_code_service,
                tax_rate_service=tax_rate_service,
                successful_rows=successful_rows,
                failed_rows=failed_rows,
                pending_orders=pending_orders,
                pending_failed_rows=pending_failed_rows,
            )
    except Exception:
        logger.exception("Import task %s failed with unexpected error", task_id)
    finally:
        if pending_orders or pending_failed_rows:
            inserted_count, flushed_failed = await _flush_pending_import_batch(
                pending_orders=pending_orders,
                pending_failed_rows=pending_failed_rows,
            )
            successful_rows += inserted_count
            failed_rows += flushed_failed
        await _update_file_task_progress(
            task_id=task_id,
            successful_rows=successful_rows,
            failed_rows=failed_rows,
            status=FILE_TASK_STATUS_COMPLETED,
        )


async def _process_indexed_rows_batch(
    task_id: int,
    task_user_id: int,
    indexed_rows: list[tuple[int, dict[str, str]]],
    columns: dict[str, str],
    use_parallel: bool,
    reporting_code_service: ReportingCodeByCoordinatesService,
    tax_rate_service: TaxRateByReportingCodeService,
    successful_rows: int,
    failed_rows: int,
    pending_orders: list[Order],
    pending_failed_rows: int,
) -> tuple[int, int, int, list[Order], int]:
    processed_rows = 0
    if use_parallel and len(indexed_rows) > PARALLEL_IMPORT_THRESHOLD:
        row_outcomes = await _compute_outcomes_parallel(
            indexed_rows=indexed_rows,
            columns=columns,
            reporting_code_service=reporting_code_service,
            tax_rate_service=tax_rate_service,
        )
    else:
        row_outcomes = _compute_outcomes_sequential(
            indexed_rows=indexed_rows,
            columns=columns,
            reporting_code_service=reporting_code_service,
            tax_rate_service=tax_rate_service,
        )

    for row_number, success, computed in row_outcomes:
        processed_rows = row_number
        if success and computed is not None:
            pending_orders.append(Order(user_id=task_user_id, **computed))
        else:
            pending_failed_rows += 1

        if len(pending_orders) >= IMPORT_BULK_INSERT_BATCH_SIZE:
            inserted_count, flushed_failed = await _flush_pending_import_batch(
                pending_orders=pending_orders,
                pending_failed_rows=pending_failed_rows,
            )
            successful_rows += inserted_count
            failed_rows += flushed_failed
            pending_orders = []
            pending_failed_rows = 0

        if processed_rows % 30 == 0:
            await _update_file_task_progress(
                task_id=task_id,
                successful_rows=successful_rows,
                failed_rows=failed_rows,
                status=FILE_TASK_STATUS_IN_PROGRESS,
            )

    return successful_rows, failed_rows, processed_rows, pending_orders, pending_failed_rows


def _resolve_import_columns(fieldnames: list[str] | None) -> dict[str, str]:
    if not fieldnames:
        raise ValueError("CSV file is empty or has no header.")

    normalized: dict[str, str] = {}
    for field in fieldnames:
        key = field.strip().lower().replace("_", "").replace(" ", "")
        normalized[key] = field

    required_keys = ("longitude", "latitude", "timestamp", "subtotal")
    missing = [key for key in required_keys if key not in normalized]
    if missing:
        raise ValueError(f"Missing required CSV columns: {', '.join(missing)}")
    return {key: normalized[key] for key in required_keys}


def _parse_import_row(
    row: dict[str, str],
    columns: dict[str, str],
) -> tuple[float, float, datetime, Decimal]:
    longitude = float(row[columns["longitude"]].strip())
    latitude = float(row[columns["latitude"]].strip())
    timestamp = _parse_import_timestamp(row[columns["timestamp"]].strip())
    subtotal = Decimal(row[columns["subtotal"]].strip())
    if subtotal < 0:
        raise ValueError("subtotal must be >= 0")
    return latitude, longitude, timestamp, subtotal


def _compute_outcomes_sequential(
    indexed_rows: list[tuple[int, dict[str, str]]],
    columns: dict[str, str],
    reporting_code_service: ReportingCodeByCoordinatesService,
    tax_rate_service: TaxRateByReportingCodeService,
) -> list[tuple[int, bool, OrderComputedPayload | None]]:
    outcomes: list[tuple[int, bool, OrderComputedPayload | None]] = []
    for row_number, row in indexed_rows:
        outcomes.append(
            _compute_row_outcome(
                row_number=row_number,
                row=row,
                columns=columns,
                reporting_code_service=reporting_code_service,
                tax_rate_service=tax_rate_service,
            )
        )
    return outcomes


async def _compute_outcomes_parallel(
    indexed_rows: list[tuple[int, dict[str, str]]],
    columns: dict[str, str],
    reporting_code_service: ReportingCodeByCoordinatesService,
    tax_rate_service: TaxRateByReportingCodeService,
) -> list[tuple[int, bool, OrderComputedPayload | None]]:
    chunks = _split_rows_into_chunks(indexed_rows=indexed_rows, chunks_count=PARALLEL_IMPORT_CHUNKS)
    chunk_futures = [
        asyncio.to_thread(
            _compute_outcomes_sequential,
            chunk,
            columns,
            reporting_code_service,
            tax_rate_service,
        )
        for chunk in chunks
        if chunk
    ]
    chunk_results = await asyncio.gather(*chunk_futures)
    flat_results = [item for chunk in chunk_results for item in chunk]
    return sorted(flat_results, key=lambda item: item[0])


def _split_rows_into_chunks(
    indexed_rows: list[tuple[int, dict[str, str]]],
    chunks_count: int,
) -> list[list[tuple[int, dict[str, str]]]]:
    if not indexed_rows:
        return []
    chunks: list[list[tuple[int, dict[str, str]]]] = [[] for _ in range(chunks_count)]
    for idx, row in enumerate(indexed_rows):
        chunks[idx % chunks_count].append(row)
    return chunks


def _compute_row_outcome(
    row_number: int,
    row: dict[str, str],
    columns: dict[str, str],
    reporting_code_service: ReportingCodeByCoordinatesService,
    tax_rate_service: TaxRateByReportingCodeService,
) -> tuple[int, bool, OrderComputedPayload | None]:
    try:
        latitude, longitude, timestamp, subtotal = _parse_import_row(row=row, columns=columns)
    except Exception as exc:
        logger.warning(
            "Import row %s parse error: %s",
            row_number,
            exc,
        )
        return (row_number, False, None)

    try:
        computed = _compute_order_values(
            latitude=latitude,
            longitude=longitude,
            timestamp=timestamp,
            subtotal_raw=subtotal,
            reporting_code_service=reporting_code_service,
            tax_rate_service=tax_rate_service,
        )
        return (row_number, True, computed)
    except ValueError as exc:
        if "outside New York State coverage" in str(exc):
            logger.warning(
                "Import row %s is outside NY coverage: latitude=%s longitude=%s",
                row_number,
                latitude,
                longitude,
            )
        else:
            logger.warning(
                "Import row %s validation error: %s (latitude=%s longitude=%s)",
                row_number,
                exc,
                latitude,
                longitude,
            )
        return (row_number, False, None)
    except LookupError as exc:
        logger.warning(
            "Import row %s tax lookup error: %s (latitude=%s longitude=%s)",
            row_number,
            exc,
            latitude,
            longitude,
        )
        return (row_number, False, None)
    except Exception:
        logger.exception(
            "Import row %s unexpected processing error (latitude=%s longitude=%s)",
            row_number,
            latitude,
            longitude,
        )
        return (row_number, False, None)


def _parse_import_timestamp(raw_timestamp: str) -> datetime:
    clean = raw_timestamp.strip()
    if not clean:
        raise ValueError("timestamp is empty")

    if "." not in clean:
        return datetime.fromisoformat(clean)

    base, rest = clean.split(".", 1)
    tz_start = len(rest)
    for marker in ("+", "-", "Z", "z"):
        pos = rest.find(marker)
        if pos != -1:
            tz_start = min(tz_start, pos)
    frac = rest[:tz_start]
    tz = rest[tz_start:]
    frac = (frac + "000000")[:6]
    normalized = f"{base}.{frac}{tz}"
    if normalized.endswith("Z") or normalized.endswith("z"):
        normalized = f"{normalized[:-1]}+00:00"
    return datetime.fromisoformat(normalized)


async def _update_file_task_progress(
    task_id: int,
    successful_rows: int,
    failed_rows: int,
    status: str,
) -> None:
    task = await FileTask.get_or_none(id=task_id)
    if not task:
        return
    task.successful_rows = successful_rows
    task.failed_rows = failed_rows
    task.status = status
    await task.save(update_fields=["successful_rows", "failed_rows", "status", "updated_at"])


async def _flush_pending_import_batch(
    pending_orders: list[Order],
    pending_failed_rows: int,
) -> tuple[int, int]:
    inserted_count = 0
    if pending_orders:
        await Order.bulk_create(
            pending_orders,
            batch_size=IMPORT_BULK_INSERT_BATCH_SIZE,
        )
        inserted_count = len(pending_orders)
    return inserted_count, pending_failed_rows


def _extract_object_name(file_path: str, bucket: str) -> str:
    prefix = f"{bucket}/"
    if file_path.startswith(prefix):
        return file_path[len(prefix) :]

    parsed = urlsplit(file_path)
    if parsed.scheme and parsed.netloc:
        path = unquote(parsed.path.lstrip("/"))
        if path.startswith(prefix):
            return path[len(prefix) :]
        return path

    return file_path
