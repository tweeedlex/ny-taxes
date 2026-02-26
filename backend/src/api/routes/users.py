from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from src.api.deps import require_authority
from src.core.authorities import EDIT_USERS, READ_USERS
from src.models.user import User
from src.schemas.user import UserCreate, UserRead, UserUpdate
from src.services.users import (
    UserAlreadyExistsError,
    UserNotFoundError,
    create_user as create_user_service,
    delete_user as delete_user_service,
    get_user_or_raise,
    list_users as list_users_service,
    update_user as update_user_service,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead])
async def list_users(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(require_authority(READ_USERS)),
) -> list[User]:
    return await list_users_service(limit=limit, offset=offset)


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: int,
    _: User = Depends(require_authority(READ_USERS)),
) -> User:
    try:
        return await get_user_or_raise(user_id)
    except UserNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    _: User = Depends(require_authority(EDIT_USERS)),
) -> User:
    try:
        return await create_user_service(payload)
    except UserAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    _: User = Depends(require_authority(EDIT_USERS)),
) -> User:
    try:
        return await update_user_service(user_id=user_id, payload=payload)
    except UserNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except UserAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    _: User = Depends(require_authority(EDIT_USERS)),
) -> Response:
    try:
        await delete_user_service(user_id)
    except UserNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)
