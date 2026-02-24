from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class OrderCreateRequest(BaseModel):
    latitude: float = Field(ge=-90.0, le=90.0)
    longitude: float = Field(ge=-180.0, le=180.0)
    subtotal: Decimal = Field(ge=Decimal("0.00"))
    timestamp: datetime


class TaxBreakdownResponse(BaseModel):
    state_rate: float
    county_rate: float
    city_rate: float
    special_rates: float


class OrderTaxCalculationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    composite_tax_rate: float
    tax_amount: float
    total_amount: float
    breakdown: TaxBreakdownResponse
