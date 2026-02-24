from src.core.authorities import EDIT_ORDERS, EDIT_USERS, READ_ORDERS, READ_USERS
from src.core.config import settings
from src.core.security import hash_password
from src.models.user import User


async def ensure_bootstrap_admin() -> None:
    if not settings.bootstrap_admin_login or not settings.bootstrap_admin_password:
        return

    required_authorities = [READ_USERS, EDIT_USERS, READ_ORDERS, EDIT_ORDERS]
    existing = await User.get_or_none(login=settings.bootstrap_admin_login)
    if existing:
        current_authorities = existing.authorities or []
        merged_authorities = sorted(set(current_authorities) | set(required_authorities))
        if merged_authorities != sorted(set(current_authorities)):
            existing.authorities = merged_authorities
            await existing.save(update_fields=["authorities"])
        return

    await User.create(
        login=settings.bootstrap_admin_login,
        password_hash=hash_password(settings.bootstrap_admin_password),
        full_name=settings.bootstrap_admin_full_name,
        is_active=True,
        authorities=required_authorities,
    )
