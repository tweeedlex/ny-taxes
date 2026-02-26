from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from src.api.deps import get_current_user, get_session_manager
from src.core.config import settings
from src.core.sessions import SessionManager, clear_session_cookie, set_session_cookie
from src.models.user import User
from src.schemas.auth import LoginRequest, RegisterRequest
from src.schemas.user import UserRead
from src.services.users import (
    InactiveUserError,
    InvalidCredentialsError,
    UserAlreadyExistsError,
    authenticate_user,
    register_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    response: Response,
    session_manager: SessionManager = Depends(get_session_manager),
) -> User:
    try:
        user = await register_user(payload)
    except UserAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    session_id = await session_manager.create_session(user.id)
    set_session_cookie(response, session_id)
    return user


@router.post("/login", response_model=UserRead)
async def login(
    payload: LoginRequest,
    response: Response,
    session_manager: SessionManager = Depends(get_session_manager),
) -> User:
    try:
        user = await authenticate_user(payload)
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc
    except InactiveUserError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    session_id = await session_manager.create_session(user.id)
    set_session_cookie(response, session_id)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    session_manager: SessionManager = Depends(get_session_manager),
) -> Response:
    del current_user
    session_id = request.cookies.get(settings.session_cookie_name)
    if session_id:
        await session_manager.delete_session(session_id)
    clear_session_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserRead)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
