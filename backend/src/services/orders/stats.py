from datetime import date, datetime, time, timedelta
from decimal import Decimal, ROUND_HALF_UP

from src.models.order import Order
from src.schemas.order import OrdersStatsDay, OrdersStatsResponse


def parse_stats_date_param(name: str, value: str) -> date:
    try:
        return datetime.strptime(value, "%Y.%m.%d").date()
    except ValueError as exc:
        raise ValueError(f"{name} must be in format YYYY.MM.DD") from exc


def build_datetime_range(start_date: date, end_date: date) -> tuple[datetime, datetime]:
    start_dt = datetime.combine(start_date, time.min)
    end_dt_exclusive = datetime.combine(end_date + timedelta(days=1), time.min)
    return start_dt, end_dt_exclusive


def build_orders_stats_response(
    start_date: date,
    end_date: date,
    orders: list[Order],
) -> OrdersStatsResponse:
    totals_by_day = {
        current: {
            "total_amount": Decimal("0.00"),
            "total_tax_amount": Decimal("0.00"),
            "total_orders": 0,
        }
        for current in _date_range(start_date, end_date)
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


def _date_range(start_date: date, end_date: date) -> list[date]:
    days: list[date] = []
    current = start_date
    while current <= end_date:
        days.append(current)
        current += timedelta(days=1)
    return days
