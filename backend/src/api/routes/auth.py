from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from ..deps import get_current_user, get_session_manager
from ...core.config import settings
from ...core.security import hash_password, verify_password
from ...core.sessions import SessionManager, clear_session_cookie, set_session_cookie
from ...models.user import User
from ...schemas.auth import LoginRequest, RegisterRequest
from ...schemas.user import UserRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    response: Response,
    session_manager: SessionManager = Depends(get_session_manager),
) -> User:
    existing = await User.get_or_none(login=payload.login)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this login already exists",
        )

    user = await User.create(
        login=payload.login,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        authorities=[],
    )

    session_id = await session_manager.create_session(user.id)
    set_session_cookie(response, session_id)
    return user


@router.post("/login", response_model=UserRead)
async def login(
    payload: LoginRequest,
    response: Response,
    session_manager: SessionManager = Depends(get_session_manager),
) -> User:
    user = await User.get_or_none(login=payload.login)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid login or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive",
        )

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
