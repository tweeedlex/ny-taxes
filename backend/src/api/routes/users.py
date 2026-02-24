from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from src.api.deps import require_authority
from src.core.authorities import EDIT_USERS, READ_USERS
from src.core.security import hash_password
from src.models.user import User
from src.schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead])
async def list_users(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(require_authority(READ_USERS)),
) -> list[User]:
    return await User.all().offset(offset).limit(limit).order_by("id")


@router.get("/{user_id}", response_model=UserRead)
async def get_user(
    user_id: int,
    _: User = Depends(require_authority(READ_USERS)),
) -> User:
    user = await User.get_or_none(id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    _: User = Depends(require_authority(EDIT_USERS)),
) -> User:
    existing = await User.get_or_none(login=payload.login)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this login already exists",
        )

    return await User.create(
        login=payload.login,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        is_active=payload.is_active,
        authorities=payload.authorities,
    )


@router.patch("/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    _: User = Depends(require_authority(EDIT_USERS)),
) -> User:
    user = await User.get_or_none(id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = payload.model_dump(exclude_unset=True)

    new_login = update_data.get("login")
    if new_login and new_login != user.login:
        login_owner = await User.get_or_none(login=new_login)
        if login_owner:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this login already exists",
            )

    new_password = update_data.pop("password", None)
    if new_password:
        user.password_hash = hash_password(new_password)

    for field, value in update_data.items():
        setattr(user, field, value)

    await user.save()
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    _: User = Depends(require_authority(EDIT_USERS)),
) -> Response:
    user = await User.get_or_none(id=user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    await user.delete()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
