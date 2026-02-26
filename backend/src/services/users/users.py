from src.core.security import hash_password
from src.models.user import User
from src.schemas.user import UserCreate, UserUpdate
from src.services.users.errors import UserAlreadyExistsError, UserNotFoundError


async def list_users(limit: int, offset: int) -> list[User]:
    return await User.all().offset(offset).limit(limit).order_by("id")


async def get_user_or_raise(user_id: int) -> User:
    user = await User.get_or_none(id=user_id)
    if not user:
        raise UserNotFoundError("User not found")
    return user


async def create_user(payload: UserCreate) -> User:
    existing = await User.get_or_none(login=payload.login)
    if existing:
        raise UserAlreadyExistsError("User with this login already exists")

    return await User.create(
        login=payload.login,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        is_active=payload.is_active,
        authorities=payload.authorities,
    )


async def update_user(user_id: int, payload: UserUpdate) -> User:
    user = await get_user_or_raise(user_id)
    update_data = payload.model_dump(exclude_unset=True)

    new_login = update_data.get("login")
    if new_login and new_login != user.login:
        login_owner = await User.get_or_none(login=new_login)
        if login_owner:
            raise UserAlreadyExistsError("User with this login already exists")

    new_password = update_data.pop("password", None)
    if new_password:
        user.password_hash = hash_password(new_password)

    for field, value in update_data.items():
        setattr(user, field, value)

    await user.save()
    return user


async def delete_user(user_id: int) -> None:
    user = await get_user_or_raise(user_id)
    await user.delete()
