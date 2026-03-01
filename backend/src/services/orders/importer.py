import asyncio
import csv
import io
import json
import logging
import os
import threading
import tempfile
import time
from datetime import datetime
from decimal import Decimal
from typing import Any, NamedTuple
from urllib.parse import unquote, urlsplit

from redis.asyncio import Redis

from src.core.date_rules import ensure_min_supported_datetime
from src.core.reporting_code import normalize_reporting_code
from src.core.storage import MinioStorage
from src.models.file_task import FileTask
from src.models.order import Order
from src.services.orders.calculator import compute_order_values_by_reporting_code
from src.services.orders.types import OrderComputedPayload
from src.services.tax import (
    ReportingCodeByCoordinatesService,
    TaxRateBreakdown,
    TaxRateByReportingCodeService,
)

logger = logging.getLogger(__name__)

FILE_TASK_STATUS_IN_PROGRESS = "in_progress"
FILE_TASK_STATUS_COMPLETED = "completed"
PARALLEL_IMPORT_THRESHOLD = 100
PARALLEL_IMPORT_CHUNKS = 5
IMPORT_BULK_INSERT_BATCH_SIZE = 500
IMPORT_COMPUTE_BATCH_SIZE = 1000
IMPORT_PROGRESS_UPDATE_ROWS = 1000
IMPORT_PROGRESS_UPDATE_SECONDS = 2.0
TAX_RATE_CACHE_HASH_KEY = "tax-rate-breakdowns:v1"


class _ImportColumnIndexes(NamedTuple):
    longitude: int
    latitude: int
    timestamp: int
    subtotal: int


class _ParsedImportRow(NamedTuple):
    row_number: int
    latitude: float
    longitude: float
    timestamp: datetime
    subtotal: Decimal


def _build_breakdown_from_jurisdictions(
    reporting_code: str,
    jurisdictions: dict[str, list[dict[str, str | float]]],
) -> TaxRateBreakdown:
    state_rate = round(sum(float(item["rate"]) for item in jurisdictions["state_rate"]), 5)
    county_rate = round(
        sum(float(item["rate"]) for item in jurisdictions["county_rate"]),
        5,
    )
    city_rate = round(sum(float(item["rate"]) for item in jurisdictions["city_rate"]), 5)
    special_rates = round(
        sum(float(item["rate"]) for item in jurisdictions["special_rates"]),
        5,
    )
    composite_tax_rate = round(state_rate + county_rate + city_rate + special_rates, 5)
    return TaxRateBreakdown(
        reporting_code=reporting_code,
        jurisdictions=jurisdictions,
        state_rate=state_rate,
        county_rate=county_rate,
        city_rate=city_rate,
        special_rates=special_rates,
        composite_tax_rate=composite_tax_rate,
    )


class _RedisBackedTaxRateService:
    def __init__(
        self,
        base_service: TaxRateByReportingCodeService,
        cached_breakdowns: dict[str, TaxRateBreakdown],
    ) -> None:
        self._base_service = base_service
        self._cached_breakdowns = cached_breakdowns
        self._pending_cache_payloads: dict[str, str] = {}
        self._lock = threading.Lock()

    @classmethod
    async def create(
        cls,
        redis_client: Redis,
        base_service: TaxRateByReportingCodeService,
    ) -> "_RedisBackedTaxRateService":
        cached_breakdowns: dict[str, TaxRateBreakdown] = {}
        redis_rows = await redis_client.hgetall(TAX_RATE_CACHE_HASH_KEY)
        for raw_code, raw_payload in redis_rows.items():
            try:
                code = normalize_reporting_code(str(raw_code))
                payload = json.loads(raw_payload)
                jurisdictions = base_service.parse_rate_payload(payload, code)
                cached_breakdowns[code] = _build_breakdown_from_jurisdictions(
                    reporting_code=code,
                    jurisdictions=jurisdictions,
                )
            except Exception:
                logger.debug("Failed to parse redis tax-rate cache for code=%s", raw_code)
        return cls(base_service=base_service, cached_breakdowns=cached_breakdowns)

    def get_tax_rate_breakdown(self, reporting_code: str) -> TaxRateBreakdown | None:
        normalized_code = normalize_reporting_code(reporting_code)
        with self._lock:
            cached = self._cached_breakdowns.get(normalized_code)
        if cached is not None:
            return cached

        resolved = self._base_service.get_tax_rate_breakdown(normalized_code)
        if resolved is None:
            return None

        with self._lock:
            existing = self._cached_breakdowns.get(normalized_code)
            if existing is not None:
                return existing
            self._cached_breakdowns[normalized_code] = resolved
            self._pending_cache_payloads[normalized_code] = json.dumps(
                resolved.jurisdictions,
                separators=(",", ":"),
            )
        return resolved

    async def flush_to_redis(self, redis_client: Redis) -> None:
        with self._lock:
            if not self._pending_cache_payloads:
                return
            payload = dict(self._pending_cache_payloads)
            self._pending_cache_payloads.clear()
        await redis_client.hset(TAX_RATE_CACHE_HASH_KEY, mapping=payload)


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
    redis_client: Redis | None = None,
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
                None,
                redis_client,
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
    redis_client: Redis | None = None,
) -> None:
    task = await FileTask.get_or_none(id=task_id)
    if not task:
        return

    successful_rows = task.successful_rows
    failed_rows = task.failed_rows
    processed_rows = successful_rows + failed_rows
    pending_orders: list[Order] = []
    pending_failed_rows = 0
    last_progress_update_at = time.monotonic()
    object_name = _extract_object_name(file_path=task.file_path, bucket=storage.bucket)
    text_stream: io.TextIOBase | None = None
    cached_tax_rate_service: _RedisBackedTaxRateService | None = None
    temp_file_path: str | None = None

    try:
        if redis_client is not None:
            cached_tax_rate_service = await _RedisBackedTaxRateService.create(
                redis_client=redis_client,
                base_service=tax_rate_service,
            )

        effective_tax_rate_service: Any = (
            cached_tax_rate_service if cached_tax_rate_service is not None else tax_rate_service
        )

        if source_content is None:
            with tempfile.NamedTemporaryFile(prefix="orders-import-", suffix=".csv", delete=False) as tmp_file:
                temp_file_path = tmp_file.name
            await asyncio.to_thread(
                storage.download_object_to_file,
                object_name,
                temp_file_path,
            )
            text_stream = open(temp_file_path, mode="r", encoding="utf-8-sig", newline="")
        else:
            text_stream = io.StringIO(source_content.decode("utf-8-sig"))

        header_line = text_stream.readline()
        if not header_line:
            raise ValueError("CSV file is empty or has no header.")
        header_rows = list(csv.reader([header_line]))
        if not header_rows:
            raise ValueError("CSV file is empty or has no header.")
        columns = _resolve_import_columns(header_rows[0])

        total_remaining_rows = max(task.total_rows - processed_rows, 0)
        use_parallel = total_remaining_rows > PARALLEL_IMPORT_THRESHOLD
        indexed_rows_batch: list[tuple[int, str]] = []

        for row_number, line in enumerate(text_stream, start=1):
            if row_number <= processed_rows:
                continue

            indexed_rows_batch.append((row_number, line))
            if len(indexed_rows_batch) < IMPORT_COMPUTE_BATCH_SIZE:
                continue

            (
                successful_rows,
                failed_rows,
                processed_rows,
                pending_orders,
                pending_failed_rows,
                last_progress_update_at,
            ) = await _process_indexed_rows_batch(
                task_id=task_id,
                task_user_id=task.user_id,
                indexed_rows=indexed_rows_batch,
                columns=columns,
                use_parallel=use_parallel,
                reporting_code_service=reporting_code_service,
                tax_rate_service=effective_tax_rate_service,
                successful_rows=successful_rows,
                failed_rows=failed_rows,
                pending_orders=pending_orders,
                pending_failed_rows=pending_failed_rows,
                last_progress_update_at=last_progress_update_at,
            )
            indexed_rows_batch = []

        if indexed_rows_batch:
            (
                successful_rows,
                failed_rows,
                processed_rows,
                pending_orders,
                pending_failed_rows,
                last_progress_update_at,
            ) = await _process_indexed_rows_batch(
                task_id=task_id,
                task_user_id=task.user_id,
                indexed_rows=indexed_rows_batch,
                columns=columns,
                use_parallel=use_parallel,
                reporting_code_service=reporting_code_service,
                tax_rate_service=effective_tax_rate_service,
                successful_rows=successful_rows,
                failed_rows=failed_rows,
                pending_orders=pending_orders,
                pending_failed_rows=pending_failed_rows,
                last_progress_update_at=last_progress_update_at,
            )
    except Exception:
        logger.exception("Import task %s failed with unexpected error", task_id)
    finally:
        if text_stream is not None:
            text_stream.close()
        if temp_file_path is not None:
            try:
                os.remove(temp_file_path)
            except FileNotFoundError:
                pass

        if cached_tax_rate_service is not None and redis_client is not None:
            try:
                await cached_tax_rate_service.flush_to_redis(redis_client)
            except Exception:
                logger.debug("Failed to flush tax-rate cache to redis")

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
    indexed_rows: list[tuple[int, str]],
    columns: _ImportColumnIndexes,
    use_parallel: bool,
    reporting_code_service: ReportingCodeByCoordinatesService,
    tax_rate_service: TaxRateByReportingCodeService,
    successful_rows: int,
    failed_rows: int,
    pending_orders: list[Order],
    pending_failed_rows: int,
    last_progress_update_at: float,
) -> tuple[int, int, int, list[Order], int, float]:
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

        now = time.monotonic()
        if (
            processed_rows % IMPORT_PROGRESS_UPDATE_ROWS == 0
            and (now - last_progress_update_at) >= IMPORT_PROGRESS_UPDATE_SECONDS
        ):
            await _update_file_task_progress(
                task_id=task_id,
                successful_rows=successful_rows + len(pending_orders),
                failed_rows=failed_rows + pending_failed_rows,
                status=FILE_TASK_STATUS_IN_PROGRESS,
            )
            last_progress_update_at = now

    return (
        successful_rows,
        failed_rows,
        processed_rows,
        pending_orders,
        pending_failed_rows,
        last_progress_update_at,
    )


def _resolve_import_columns(fieldnames: list[str] | None) -> _ImportColumnIndexes:
    if not fieldnames:
        raise ValueError("CSV file is empty or has no header.")

    normalized_to_index: dict[str, int] = {}
    for idx, field in enumerate(fieldnames):
        key = field.strip().lower().replace("_", "").replace(" ", "")
        normalized_to_index[key] = idx

    required_keys = ("longitude", "latitude", "timestamp", "subtotal")
    missing = [key for key in required_keys if key not in normalized_to_index]
    if missing:
        raise ValueError(f"Missing required CSV columns: {', '.join(missing)}")

    return _ImportColumnIndexes(
        longitude=normalized_to_index["longitude"],
        latitude=normalized_to_index["latitude"],
        timestamp=normalized_to_index["timestamp"],
        subtotal=normalized_to_index["subtotal"],
    )


def _parse_import_row(
    line: str,
    columns: _ImportColumnIndexes,
) -> tuple[float, float, datetime, Decimal]:
    parsed_rows = list(csv.reader([line]))
    if not parsed_rows:
        raise ValueError("CSV row is empty")
    row = parsed_rows[0]
    latitude = float(row[columns.latitude].strip())
    longitude = float(row[columns.longitude].strip())
    timestamp = _parse_import_timestamp(row[columns.timestamp].strip())
    subtotal = Decimal(row[columns.subtotal].strip())
    if subtotal < 0:
        raise ValueError("subtotal must be >= 0")
    if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
        raise ValueError("coordinates out of bounds")
    return latitude, longitude, timestamp, subtotal


def _compute_outcomes_sequential(
    indexed_rows: list[tuple[int, str]],
    columns: _ImportColumnIndexes,
    reporting_code_service: ReportingCodeByCoordinatesService,
    tax_rate_service: TaxRateByReportingCodeService,
) -> list[tuple[int, bool, OrderComputedPayload | None]]:
    parsed_rows: list[_ParsedImportRow] = []
    outcomes: list[tuple[int, bool, OrderComputedPayload | None]] = []

    for row_number, line in indexed_rows:
        try:
            latitude, longitude, timestamp, subtotal = _parse_import_row(
                line=line,
                columns=columns,
            )
            parsed_rows.append(
                _ParsedImportRow(
                    row_number=row_number,
                    latitude=latitude,
                    longitude=longitude,
                    timestamp=timestamp,
                    subtotal=subtotal,
                )
            )
        except Exception as exc:
            outcomes.append((row_number, False, None))

    if not parsed_rows:
        return outcomes

    reporting_codes = reporting_code_service.get_reporting_codes_batch(
        [(row.latitude, row.longitude) for row in parsed_rows]
    )

    for row, reporting_code in zip(parsed_rows, reporting_codes, strict=False):
        if reporting_code is None:
            outcomes.append((row.row_number, False, None))
            continue

        try:
            computed = compute_order_values_by_reporting_code(
                latitude=row.latitude,
                longitude=row.longitude,
                timestamp=row.timestamp,
                subtotal_raw=row.subtotal,
                reporting_code=reporting_code,
                tax_rate_service=tax_rate_service,
            )
            outcomes.append((row.row_number, True, computed))
        except LookupError as exc:
            logger.debug(
                "Import row %s tax lookup error: %s (latitude=%s longitude=%s)",
                row.row_number,
                exc,
                row.latitude,
                row.longitude,
            )
            outcomes.append((row.row_number, False, None))
        except Exception:
            logger.exception(
                "Import row %s unexpected processing error (latitude=%s longitude=%s)",
                row.row_number,
                row.latitude,
                row.longitude,
            )
            outcomes.append((row.row_number, False, None))

    return sorted(outcomes, key=lambda item: item[0])


async def _compute_outcomes_parallel(
    indexed_rows: list[tuple[int, str]],
    columns: _ImportColumnIndexes,
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
    indexed_rows: list[tuple[int, str]],
    chunks_count: int,
) -> list[list[tuple[int, str]]]:
    if not indexed_rows:
        return []
    chunks: list[list[tuple[int, str]]] = [[] for _ in range(chunks_count)]
    for idx, row in enumerate(indexed_rows):
        chunks[idx % chunks_count].append(row)
    return chunks


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
    await FileTask.filter(id=task_id).update(
        successful_rows=successful_rows,
        failed_rows=failed_rows,
        status=status,
        updated_at=datetime.utcnow(),
    )


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
