from typing import Callable

from fastapi import Depends, HTTPException, Request, status

from ..core.config import settings
from ..core.sessions import SessionManager
from ..models.user import User
from ..services import TaxRateByZipService, ZipCodeByCoordinatesService


def get_session_manager(request: Request) -> SessionManager:
    return request.app.state.session_manager


def get_zip_code_service(request: Request) -> ZipCodeByCoordinatesService:
    return request.app.state.zip_code_service


def get_tax_rate_service(request: Request) -> TaxRateByZipService:
    return request.app.state.tax_rate_service


async def get_current_user(
    request: Request,
    session_manager: SessionManager = Depends(get_session_manager),
) -> User:
    session_id = request.cookies.get(settings.session_cookie_name)
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    user_id = await session_manager.get_user_id(session_id)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is invalid or expired",
        )

    user = await User.get_or_none(id=user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is inactive or missing",
        )

    return user


def require_authority(authority: str) -> Callable:
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        if authority not in (current_user.authorities or []):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing authority: {authority}",
            )
        return current_user

    return checker
