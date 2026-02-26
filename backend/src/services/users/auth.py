from src.core.security import hash_password, verify_password
from src.models.user import User
from src.schemas.auth import LoginRequest, RegisterRequest
from src.services.users.errors import (
    InactiveUserError,
    InvalidCredentialsError,
    UserAlreadyExistsError,
)


async def register_user(payload: RegisterRequest) -> User:
    existing = await User.get_or_none(login=payload.login)
    if existing:
        raise UserAlreadyExistsError("User with this login already exists")

    return await User.create(
        login=payload.login,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        authorities=[],
    )


async def authenticate_user(payload: LoginRequest) -> User:
    user = await User.get_or_none(login=payload.login)
    if not user or not verify_password(payload.password, user.password_hash):
        raise InvalidCredentialsError("Invalid login or password")
    if not user.is_active:
        raise InactiveUserError("User is inactive")
    return user
