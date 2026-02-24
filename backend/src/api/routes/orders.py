from datetime import date, datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ...core.authorities import EDIT_ORDERS, READ_ORDERS
from ...models.order import Order
from ...models.user import User
from ...services import TaxRateByZipService, ZipCodeByCoordinatesService
from ...schemas.order import (
    OrderCreateRequest,
    OrderRead,
    OrdersListResponse,
    OrdersStatsDay,
    OrdersStatsResponse,
    OrderTaxCalculationResponse,
    TaxBreakdownResponse,
)
from ..deps import get_tax_rate_service, get_zip_code_service, require_authority

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderTaxCalculationResponse)
async def calculate_order_tax(
    payload: OrderCreateRequest,
    _: User = Depends(require_authority(EDIT_ORDERS)),
    zip_service: ZipCodeByCoordinatesService = Depends(get_zip_code_service),
    tax_rate_service: TaxRateByZipService = Depends(get_tax_rate_service),
) -> OrderTaxCalculationResponse:
    zip_code = zip_service.get_zip_code(lat=payload.latitude, lon=payload.longitude)
    if zip_code is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Delivery point is outside New York State coverage.",
        )

    rates = tax_rate_service.get_tax_rate_breakdown(zip_code)
    if rates is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tax rate not found for ZIP code {zip_code}.",
        )

    subtotal = payload.subtotal.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    composite_tax_rate = Decimal(str(rates.estimated_combined_rate))
    tax_amount = (subtotal * composite_tax_rate).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )
    total_amount = (subtotal + tax_amount).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )
    state_rate = Decimal(str(rates.state_rate))
    county_rate = Decimal(str(rates.estimated_county_rate))
    city_rate = Decimal(str(rates.estimated_city_rate))
    special_rates = Decimal(str(rates.estimated_special_rate))

    await Order.create(
        latitude=payload.latitude,
        longitude=payload.longitude,
        subtotal=subtotal,
        timestamp=payload.timestamp,
        zip_code=zip_code,
        composite_tax_rate=composite_tax_rate,
        tax_amount=tax_amount,
        total_amount=total_amount,
        state_rate=state_rate,
        county_rate=county_rate,
        city_rate=city_rate,
        special_rates=special_rates,
    )

    return OrderTaxCalculationResponse(
        composite_tax_rate=float(composite_tax_rate),
        tax_amount=float(tax_amount),
        total_amount=float(total_amount),
        breakdown=TaxBreakdownResponse(
            state_rate=float(state_rate),
            county_rate=float(county_rate),
            city_rate=float(city_rate),
            special_rates=float(special_rates),
        ),
    )


@router.get("", response_model=OrdersListResponse)
async def list_orders(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    zip_code: str | None = Query(default=None, min_length=1, max_length=5),
    timestamp_from: datetime | None = Query(default=None),
    timestamp_to: datetime | None = Query(default=None),
    subtotal_min: Decimal | None = Query(default=None, ge=Decimal("0.00")),
    subtotal_max: Decimal | None = Query(default=None, ge=Decimal("0.00")),
    _: User = Depends(require_authority(READ_ORDERS)),
) -> OrdersListResponse:
    query = Order.all()

    if zip_code is not None:
        query = query.filter(zip_code=_normalize_zip(zip_code))

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


def _normalize_zip(raw_zip: str) -> str:
    normalized = raw_zip.strip()
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ZIP code cannot be empty",
        )
    if not normalized.isdigit():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ZIP code must contain only digits",
        )
    if len(normalized) > 5:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ZIP code must have at most 5 digits",
        )
    return normalized.zfill(5)


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
    return OrderRead(
        id=order.id,
        latitude=order.latitude,
        longitude=order.longitude,
        subtotal=float(order.subtotal),
        timestamp=order.timestamp,
        zip_code=order.zip_code,
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
