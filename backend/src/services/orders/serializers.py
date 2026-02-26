from src.models.file_task import FileTask
from src.models.order import Order
from src.schemas.order import (
    FileTaskRead,
    OrderRead,
    OrderTaxCalculationResponse,
    OrderTaxPreviewResponse,
    TaxBreakdownResponse,
)
from src.services.orders.types import JurisdictionsPayload, OrderComputedPayload


def to_order_read(order: Order) -> OrderRead:
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


def to_file_task_read(task: FileTask) -> FileTaskRead:
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


def to_order_tax_preview_response(
    computed: OrderComputedPayload,
) -> OrderTaxPreviewResponse:
    jurisdictions = _extract_jurisdictions(computed)
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


def to_order_tax_calculation_response(
    order: Order,
    author_login: str | None,
    computed: OrderComputedPayload,
) -> OrderTaxCalculationResponse:
    preview = to_order_tax_preview_response(computed)
    return OrderTaxCalculationResponse(
        order_id=order.id,
        author_user_id=order.user_id,
        author_login=author_login,
        reporting_code=preview.reporting_code,
        jurisdictions=preview.jurisdictions,
        composite_tax_rate=preview.composite_tax_rate,
        tax_amount=preview.tax_amount,
        total_amount=preview.total_amount,
        breakdown=preview.breakdown,
    )


def _extract_jurisdictions(computed: OrderComputedPayload) -> JurisdictionsPayload:
    jurisdictions = computed.get("jurisdictions")
    if not isinstance(jurisdictions, dict):
        return {}
    return jurisdictions
