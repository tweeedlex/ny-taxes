from datetime import datetime
from decimal import Decimal
from typing import TypedDict


class JurisdictionRateItemPayload(TypedDict):
    name: str
    rate: float


JurisdictionsPayload = dict[str, list[JurisdictionRateItemPayload]]


class OrderComputedPayload(TypedDict):
    latitude: float
    longitude: float
    subtotal: Decimal
    timestamp: datetime
    reporting_code: str
    jurisdictions: JurisdictionsPayload
    composite_tax_rate: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    state_rate: Decimal
    county_rate: Decimal
    city_rate: Decimal
    special_rates: Decimal
