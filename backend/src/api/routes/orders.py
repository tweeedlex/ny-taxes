from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, status

from ...core.authorities import EDIT_ORDERS
from ...models.user import User
from ...services import TaxRateByZipService, ZipCodeByCoordinatesService
from ...schemas.order import (
    OrderCreateRequest,
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

    composite_tax_rate = Decimal(str(rates.estimated_combined_rate))
    tax_amount = (payload.subtotal * composite_tax_rate).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )
    total_amount = (payload.subtotal + tax_amount).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )

    return OrderTaxCalculationResponse(
        composite_tax_rate=rates.estimated_combined_rate,
        tax_amount=float(tax_amount),
        total_amount=float(total_amount),
        breakdown=TaxBreakdownResponse(
            state_rate=rates.state_rate,
            county_rate=rates.estimated_county_rate,
            city_rate=rates.estimated_city_rate,
            special_rates=rates.estimated_special_rate,
        ),
    )
