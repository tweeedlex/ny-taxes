from typing import Callable

from fastapi import Depends, HTTPException, Request, WebSocket, WebSocketException, status

from ..core.config import settings
from ..core.sessions import SessionManager
from ..core.storage import MinioStorage
from ..models.user import User
from ..services import TaxRateByZipService, ZipCodeByCoordinatesService


def get_session_manager(request: Request) -> SessionManager:
    return request.app.state.session_manager


def get_zip_code_service(request: Request) -> ZipCodeByCoordinatesService:
    return request.app.state.zip_code_service


def get_tax_rate_service(request: Request) -> TaxRateByZipService:
    return request.app.state.tax_rate_service


def get_storage(request: Request) -> MinioStorage:
    return request.app.state.storage


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


async def get_current_user_websocket(websocket: WebSocket) -> User:
    session_manager: SessionManager = websocket.app.state.session_manager
    session_id = websocket.cookies.get(settings.session_cookie_name)
    if not session_id:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Not authenticated")

    user_id = await session_manager.get_user_id(session_id)
    if user_id is None:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Session is invalid or expired",
        )

    user = await User.get_or_none(id=user_id)
    if not user or not user.is_active:
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="User is inactive or missing",
        )
    return user


async def require_websocket_authority(websocket: WebSocket, authority: str) -> User:
    user = await get_current_user_websocket(websocket)
    if authority not in (user.authorities or []):
        raise WebSocketException(
            code=status.WS_1008_POLICY_VIOLATION,
            reason=f"Missing authority: {authority}",
        )
    return user
