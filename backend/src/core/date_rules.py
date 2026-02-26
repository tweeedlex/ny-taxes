from datetime import date, datetime


MIN_SUPPORTED_DATE = date(2025, 3, 1)


def ensure_min_supported_date(value: date, field_name: str) -> None:
    if value < MIN_SUPPORTED_DATE:
        raise ValueError(
            f"{field_name} cannot be earlier than {MIN_SUPPORTED_DATE.isoformat()}"
        )


def ensure_min_supported_datetime(value: datetime, field_name: str) -> None:
    ensure_min_supported_date(value.date(), field_name)
