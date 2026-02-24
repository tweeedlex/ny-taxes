from contextlib import asynccontextmanager
from pathlib import Path

import redis.asyncio as redis
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .api.router import api_router
from .core.bootstrap import ensure_bootstrap_admin
from .core.config import settings
from .core.database import close_db, init_db
from .core.sessions import SessionManager
from .services import TaxRateByZipService, ZipCodeByCoordinatesService


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    redis_client = redis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
    )
    await redis_client.ping()
    app.state.session_manager = SessionManager(
        redis=redis_client,
        key_prefix=settings.session_key_prefix,
        ttl_seconds=settings.session_ttl_seconds,
    )
    app.state.zip_code_service = ZipCodeByCoordinatesService()
    app.state.tax_rate_service = TaxRateByZipService()

    await ensure_bootstrap_admin()

    try:
        yield
    finally:
        await redis_client.aclose()
        await close_db()


app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)
app.include_router(api_router)
app.mount(
    "/static",
    StaticFiles(directory=Path(__file__).resolve().parent / "static"),
    name="static",
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
