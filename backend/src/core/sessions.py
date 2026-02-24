from uuid import uuid4

from fastapi import Response
from redis.asyncio import Redis

from src.core.config import settings


class SessionManager:
    def __init__(self, redis: Redis, key_prefix: str, ttl_seconds: int) -> None:
        self._redis = redis
        self._key_prefix = key_prefix
        self._ttl_seconds = ttl_seconds

    def _key(self, session_id: str) -> str:
        return f"{self._key_prefix}{session_id}"

    async def create_session(self, user_id: int) -> str:
        session_id = uuid4().hex
        await self._redis.set(self._key(session_id), str(user_id), ex=self._ttl_seconds)
        return session_id

    async def get_user_id(self, session_id: str) -> int | None:
        raw = await self._redis.get(self._key(session_id))
        if raw is None:
            return None
        try:
            return int(raw)
        except ValueError:
            return None

    async def delete_session(self, session_id: str) -> None:
        await self._redis.delete(self._key(session_id))


def set_session_cookie(response: Response, session_id: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_id,
        max_age=settings.session_ttl_seconds,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
    )
