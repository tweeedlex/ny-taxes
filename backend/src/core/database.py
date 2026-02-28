from tortoise import Tortoise

from src.core.config import settings


async def init_db() -> None:
    await Tortoise.init(
        db_url=settings.database_url,
        modules={
            "models": [
                "src.models.user",
                "src.models.order",
                "src.models.file_task",
                "src.models.tax_region",
                "src.models.tax_rate",
            ]
        },
    )
    if settings.db_generate_schemas:
        await Tortoise.generate_schemas()


async def close_db() -> None:
    await Tortoise.close_connections()
