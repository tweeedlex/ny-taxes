import asyncio
import csv
import io
import logging
from datetime import datetime
from decimal import Decimal
from urllib.parse import unquote, urlsplit

from src.core.date_rules import ensure_min_supported_datetime
from src.core.storage import MinioStorage
from src.models.file_task import FileTask
from src.models.order import Order
from src.services.orders.calculator import compute_order_values
from src.services.orders.types import OrderComputedPayload
from src.services.tax import ReportingCodeByCoordinatesService, TaxRateByReportingCodeService

logger = logging.getLogger(__name__)

FILE_TASK_STATUS_IN_PROGRESS = "in_progress"
FILE_TASK_STATUS_COMPLETED = "completed"
PARALLEL_IMPORT_THRESHOLD = 100
PARALLEL_IMPORT_CHUNKS = 5
IMPORT_BULK_INSERT_BATCH_SIZE = 500
IMPORT_COMPUTE_BATCH_SIZE = 1000


def count_csv_rows(content: bytes) -> int:
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        return 0

    reader = csv.reader(io.StringIO(text))
    total = 0
    for _ in reader:
        total += 1
    if total == 0:
        return 0
    return max(total - 1, 0)


async def resume_in_progress_import_tasks(
    storage: MinioStorage,
    reporting_code_service: ReportingCodeByCoordinatesService,
    tax_rate_service: TaxRateByReportingCodeService,
) -> set[asyncio.Task]:
    workers: set[asyncio.Task] = set()
    tasks = await FileTask.filter(status=FILE_TASK_STATUS_IN_PROGRESS).all()
    for task in tasks:
        worker = asyncio.create_task(
            process_import_task(
                task.id,
                storage,
                reporting_code_service,
                tax_rate_service,
            )
        )
        workers.add(worker)
    return workers


async def process_import_task(
    task_id: int,
    storage: MinioStorage,
    reporting_code_service: ReportingCodeByCoordinatesService,
    tax_rate_service: TaxRateByReportingCodeService,
    source_content: bytes | None = None,
) -> None:
    task = await FileTask.get_or_none(id=task_id)
    if not task:
        return

    successful_rows = task.successful_rows
    failed_rows = task.failed_rows
    processed_rows = successful_rows + failed_rows
    pending_orders: list[Order] = []
    pending_failed_rows = 0
    object_name = _extract_object_name(file_path=task.file_path, bucket=storage.bucket)

    try:
        if source_content is None:
            content_bytes = await asyncio.to_thread(storage.get_object_bytes, object_name)
        else:
            content_bytes = source_content

        text = content_bytes.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text))
        columns = _resolve_import_columns(reader.fieldnames)

        total_remaining_rows = max(task.total_rows - processed_rows, 0)
        use_parallel = total_remaining_rows > PARALLEL_IMPORT_THRESHOLD
        indexed_rows_batch: list[tuple[int, dict[str, str]]] = []

        for row_number, row in enumerate(reader, start=1):
            if row_number <= processed_rows:
                continue

            indexed_rows_batch.append((row_number, row))
            if len(indexed_rows_batch) < IMPORT_COMPUTE_BATCH_SIZE:
                continue

            (
                successful_rows,
                failed_rows,
                processed_rows,
                pending_orders,
                pending_failed_rows,
            ) = await _process_indexed_rows_batch(
                task_id=task_id,
                task_user_id=task.user_id,
                indexed_rows=indexed_rows_batch,
                columns=columns,
                use_parallel=use_parallel,
                reporting_code_service=reporting_code_service,
                tax_rate_service=tax_rate_service,
                successful_rows=successful_rows,
                failed_rows=failed_rows,
                pending_orders=pending_orders,
                pending_failed_rows=pending_failed_rows,
            )
            indexed_rows_batch = []

        if indexed_rows_batch:
            (
                successful_rows,
                failed_rows,
                processed_rows,
                pending_orders,
                pending_failed_rows,
            ) = await _process_indexed_rows_batch(
                task_id=task_id,
                task_user_id=task.user_id,
                indexed_rows=indexed_rows_batch,
                columns=columns,
                use_parallel=use_parallel,
                reporting_code_service=reporting_code_service,
                tax_rate_service=tax_rate_service,
                successful_rows=successful_rows,
                failed_rows=failed_rows,
                pending_orders=pending_orders,
                pending_failed_rows=pending_failed_rows,
            )
    except Exception:
        logger.exception("Import task %s failed with unexpected error", task_id)
    finally:
        if pending_orders or pending_failed_rows:
            inserted_count, flushed_failed = await _flush_pending_import_batch(
                pending_orders=pending_orders,
                pending_failed_rows=pending_failed_rows,
            )
            successful_rows += inserted_count
            failed_rows += flushed_failed
        await _update_file_task_progress(
            task_id=task_id,
            successful_rows=successful_rows,
            failed_rows=failed_rows,
            status=FILE_TASK_STATUS_COMPLETED,
        )


async def _process_indexed_rows_batch(
    task_id: int,
    task_user_id: int,
    indexed_rows: list[tuple[int, dict[str, str]]],
    columns: dict[str, str],
    use_parallel: bool,
    reporting_code_service: ReportingCodeByCoordinatesService,
    tax_rate_service: TaxRateByReportingCodeService,
    successful_rows: int,
    failed_rows: int,
    pending_orders: list[Order],
    pending_failed_rows: int,
) -> tuple[int, int, int, list[Order], int]:
    processed_rows = 0
    if use_parallel and len(indexed_rows) > PARALLEL_IMPORT_THRESHOLD:
        row_outcomes = await _compute_outcomes_parallel(
            indexed_rows=indexed_rows,
            columns=columns,
            reporting_code_service=reporting_code_service,
            tax_rate_service=tax_rate_service,
        )
    else:
        row_outcomes = _compute_outcomes_sequential(
            indexed_rows=indexed_rows,
            columns=columns,
            reporting_code_service=reporting_code_service,
            tax_rate_service=tax_rate_service,
        )

    for row_number, success, computed in row_outcomes:
        processed_rows = row_number
        if success and computed is not None:
            pending_orders.append(Order(user_id=task_user_id, **computed))
        else:
            pending_failed_rows += 1

        if len(pending_orders) >= IMPORT_BULK_INSERT_BATCH_SIZE:
            inserted_count, flushed_failed = await _flush_pending_import_batch(
                pending_orders=pending_orders,
                pending_failed_rows=pending_failed_rows,
            )
            successful_rows += inserted_count
            failed_rows += flushed_failed
            pending_orders = []
            pending_failed_rows = 0

        if processed_rows % 30 == 0:
            await _update_file_task_progress(
                task_id=task_id,
                successful_rows=successful_rows,
                failed_rows=failed_rows,
                status=FILE_TASK_STATUS_IN_PROGRESS,
            )

    return successful_rows, failed_rows, processed_rows, pending_orders, pending_failed_rows


def _resolve_import_columns(fieldnames: list[str] | None) -> dict[str, str]:
    if not fieldnames:
        raise ValueError("CSV file is empty or has no header.")

    normalized: dict[str, str] = {}
    for field in fieldnames:
        key = field.strip().lower().replace("_", "").replace(" ", "")
        normalized[key] = field

    required_keys = ("longitude", "latitude", "timestamp", "subtotal")
    missing = [key for key in required_keys if key not in normalized]
    if missing:
        raise ValueError(f"Missing required CSV columns: {', '.join(missing)}")
    return {key: normalized[key] for key in required_keys}


def _parse_import_row(
    row: dict[str, str],
    columns: dict[str, str],
) -> tuple[float, float, datetime, Decimal]:
    longitude = float(row[columns["longitude"]].strip())
    latitude = float(row[columns["latitude"]].strip())
    timestamp = _parse_import_timestamp(row[columns["timestamp"]].strip())
    subtotal = Decimal(row[columns["subtotal"]].strip())
    if subtotal < 0:
        raise ValueError("subtotal must be >= 0")
    return latitude, longitude, timestamp, subtotal


def _compute_outcomes_sequential(
    indexed_rows: list[tuple[int, dict[str, str]]],
    columns: dict[str, str],
    reporting_code_service: ReportingCodeByCoordinatesService,
    tax_rate_service: TaxRateByReportingCodeService,
) -> list[tuple[int, bool, OrderComputedPayload | None]]:
    outcomes: list[tuple[int, bool, OrderComputedPayload | None]] = []
    for row_number, row in indexed_rows:
        outcomes.append(
            _compute_row_outcome(
                row_number=row_number,
                row=row,
                columns=columns,
                reporting_code_service=reporting_code_service,
                tax_rate_service=tax_rate_service,
            )
        )
    return outcomes


async def _compute_outcomes_parallel(
    indexed_rows: list[tuple[int, dict[str, str]]],
    columns: dict[str, str],
    reporting_code_service: ReportingCodeByCoordinatesService,
    tax_rate_service: TaxRateByReportingCodeService,
) -> list[tuple[int, bool, OrderComputedPayload | None]]:
    chunks = _split_rows_into_chunks(
        indexed_rows=indexed_rows,
        chunks_count=PARALLEL_IMPORT_CHUNKS,
    )
    chunk_futures = [
        asyncio.to_thread(
            _compute_outcomes_sequential,
            chunk,
            columns,
            reporting_code_service,
            tax_rate_service,
        )
        for chunk in chunks
        if chunk
    ]
    chunk_results = await asyncio.gather(*chunk_futures)
    flat_results = [item for chunk in chunk_results for item in chunk]
    return sorted(flat_results, key=lambda item: item[0])


def _split_rows_into_chunks(
    indexed_rows: list[tuple[int, dict[str, str]]],
    chunks_count: int,
) -> list[list[tuple[int, dict[str, str]]]]:
    if not indexed_rows:
        return []
    chunks: list[list[tuple[int, dict[str, str]]]] = [[] for _ in range(chunks_count)]
    for idx, row in enumerate(indexed_rows):
        chunks[idx % chunks_count].append(row)
    return chunks


def _compute_row_outcome(
    row_number: int,
    row: dict[str, str],
    columns: dict[str, str],
    reporting_code_service: ReportingCodeByCoordinatesService,
    tax_rate_service: TaxRateByReportingCodeService,
) -> tuple[int, bool, OrderComputedPayload | None]:
    try:
        latitude, longitude, timestamp, subtotal = _parse_import_row(row=row, columns=columns)
    except Exception as exc:
        logger.warning(
            "Import row %s parse error: %s",
            row_number,
            exc,
        )
        return (row_number, False, None)

    try:
        computed = compute_order_values(
            latitude=latitude,
            longitude=longitude,
            timestamp=timestamp,
            subtotal_raw=subtotal,
            reporting_code_service=reporting_code_service,
            tax_rate_service=tax_rate_service,
        )
        return (row_number, True, computed)
    except ValueError as exc:
        if "outside New York State coverage" in str(exc):
            logger.warning(
                "Import row %s is outside NY coverage: latitude=%s longitude=%s",
                row_number,
                latitude,
                longitude,
            )
        else:
            logger.warning(
                "Import row %s validation error: %s (latitude=%s longitude=%s)",
                row_number,
                exc,
                latitude,
                longitude,
            )
        return (row_number, False, None)
    except LookupError as exc:
        logger.warning(
            "Import row %s tax lookup error: %s (latitude=%s longitude=%s)",
            row_number,
            exc,
            latitude,
            longitude,
        )
        return (row_number, False, None)
    except Exception:
        logger.exception(
            "Import row %s unexpected processing error (latitude=%s longitude=%s)",
            row_number,
            latitude,
            longitude,
        )
        return (row_number, False, None)


def _parse_import_timestamp(raw_timestamp: str) -> datetime:
    clean = raw_timestamp.strip()
    if not clean:
        raise ValueError("timestamp is empty")

    if "." not in clean:
        parsed = datetime.fromisoformat(clean)
        ensure_min_supported_datetime(parsed, "timestamp")
        return parsed

    base, rest = clean.split(".", 1)
    tz_start = len(rest)
    for marker in ("+", "-", "Z", "z"):
        pos = rest.find(marker)
        if pos != -1:
            tz_start = min(tz_start, pos)
    frac = rest[:tz_start]
    tz = rest[tz_start:]
    frac = (frac + "000000")[:6]
    normalized = f"{base}.{frac}{tz}"
    if normalized.endswith("Z") or normalized.endswith("z"):
        normalized = f"{normalized[:-1]}+00:00"
    parsed = datetime.fromisoformat(normalized)
    ensure_min_supported_datetime(parsed, "timestamp")
    return parsed


async def _update_file_task_progress(
    task_id: int,
    successful_rows: int,
    failed_rows: int,
    status: str,
) -> None:
    task = await FileTask.get_or_none(id=task_id)
    if not task:
        return
    task.successful_rows = successful_rows
    task.failed_rows = failed_rows
    task.status = status
    await task.save(update_fields=["successful_rows", "failed_rows", "status", "updated_at"])


async def _flush_pending_import_batch(
    pending_orders: list[Order],
    pending_failed_rows: int,
) -> tuple[int, int]:
    inserted_count = 0
    if pending_orders:
        await Order.bulk_create(
            pending_orders,
            batch_size=IMPORT_BULK_INSERT_BATCH_SIZE,
        )
        inserted_count = len(pending_orders)
    return inserted_count, pending_failed_rows


def _extract_object_name(file_path: str, bucket: str) -> str:
    prefix = f"{bucket}/"
    if file_path.startswith(prefix):
        return file_path[len(prefix) :]

    parsed = urlsplit(file_path)
    if parsed.scheme and parsed.netloc:
        path = unquote(parsed.path.lstrip("/"))
        if path.startswith(prefix):
            return path[len(prefix) :]
        return path

    return file_path
