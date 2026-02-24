from .authorities import EDIT_USERS, READ_USERS
from .config import settings
from .security import hash_password
from ..models.user import User


async def ensure_bootstrap_admin() -> None:
    if not settings.bootstrap_admin_login or not settings.bootstrap_admin_password:
        return

    existing = await User.get_or_none(login=settings.bootstrap_admin_login)
    if existing:
        return

    await User.create(
        login=settings.bootstrap_admin_login,
        password_hash=hash_password(settings.bootstrap_admin_password),
        full_name=settings.bootstrap_admin_full_name,
        is_active=True,
        authorities=[READ_USERS, EDIT_USERS],
    )
