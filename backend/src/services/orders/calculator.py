from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

from src.services.orders.types import OrderComputedPayload
from src.services.tax import ReportingCodeByCoordinatesService, TaxRateByReportingCodeService


def _build_computed_payload(
    latitude: float,
    longitude: float,
    timestamp: datetime,
    subtotal_raw: Decimal,
    reporting_code: str,
    tax_rate_service: TaxRateByReportingCodeService,
) -> OrderComputedPayload:
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


def compute_order_values_by_reporting_code(
    latitude: float,
    longitude: float,
    timestamp: datetime,
    subtotal_raw: Decimal,
    reporting_code: str,
    tax_rate_service: TaxRateByReportingCodeService,
) -> OrderComputedPayload:
    return _build_computed_payload(
        latitude=latitude,
        longitude=longitude,
        timestamp=timestamp,
        subtotal_raw=subtotal_raw,
        reporting_code=reporting_code,
        tax_rate_service=tax_rate_service,
    )


def compute_order_values(
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
    return _build_computed_payload(
        latitude=latitude,
        longitude=longitude,
        timestamp=timestamp,
        subtotal_raw=subtotal_raw,
        reporting_code=reporting_code,
        tax_rate_service=tax_rate_service,
    )
