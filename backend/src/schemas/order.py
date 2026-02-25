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


class JurisdictionRateItem(BaseModel):
    name: str
    rate: float


class OrderTaxCalculationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_id: int
    author_user_id: int | None
    author_login: str | None
    reporting_code: str
    jurisdictions: dict[str, list[JurisdictionRateItem]]
    composite_tax_rate: float
    tax_amount: float
    total_amount: float
    breakdown: TaxBreakdownResponse


class OrderRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    author_user_id: int | None
    author_login: str | None
    latitude: float
    longitude: float
    subtotal: float
    timestamp: datetime
    reporting_code: str
    jurisdictions: dict[str, list[JurisdictionRateItem]]
    composite_tax_rate: float
    tax_amount: float
    total_amount: float
    breakdown: TaxBreakdownResponse
    created_at: datetime


class OrdersListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list[OrderRead]


class OrdersStatsDay(BaseModel):
    date: str
    total_amount: float
    total_tax_amount: float
    total_orders: int


class OrdersStatsResponse(BaseModel):
    from_date: str
    to_date: str
    total_amount: float
    total_tax_amount: float
    total_orders: int
    daily: list[OrdersStatsDay]


class FileTaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    file_path: str
    total_rows: int
    successful_rows: int
    failed_rows: int
    status: str
    created_at: datetime
    updated_at: datetime


class OrderImportTaskCreateResponse(BaseModel):
    task: FileTaskRead
