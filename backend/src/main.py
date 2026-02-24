import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

import redis.asyncio as redis
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from src.api.router import api_router
from src.api.routes.orders import resume_in_progress_import_tasks
from src.core.bootstrap import ensure_bootstrap_admin
from src.core.config import settings
from src.core.database import close_db, init_db
from src.core.sessions import SessionManager
from src.core.storage import MinioStorage
from src.services import TaxRateByZipService, ZipCodeByCoordinatesService


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
    app.state.storage = MinioStorage()
    app.state.storage.ensure_bucket()
    app.state.zip_code_service = ZipCodeByCoordinatesService()
    app.state.tax_rate_service = TaxRateByZipService()

    await ensure_bootstrap_admin()
    app.state.import_workers = await resume_in_progress_import_tasks(
        storage=app.state.storage,
        zip_service=app.state.zip_code_service,
        tax_rate_service=app.state.tax_rate_service,
    )

    try:
        yield
    finally:
        import_workers = getattr(app.state, "import_workers", set())
        for worker in import_workers:
            if not worker.done():
                worker.cancel()
        if import_workers:
            await asyncio.gather(*import_workers, return_exceptions=True)
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
