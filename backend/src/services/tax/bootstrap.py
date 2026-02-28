import json
from pathlib import Path
from typing import Iterable

import shapefile

from src.core.reporting_code import normalize_reporting_code
from src.models.tax_rate import TaxRate
from src.models.tax_region import TaxRegion
from src.services.tax.reporting_code import ReportingCodeByCoordinatesService
from src.services.tax.tax_rate import TaxRateByReportingCodeService

CITY_REGION_TYPE = "city"
COUNTY_REGION_TYPE = "county"


def _chunked(items: list, size: int) -> Iterable[list]:
    for idx in range(0, len(items), size):
        yield items[idx : idx + size]


def _load_tax_regions_from_shp(
    shp_path: Path,
    region_type: str,
) -> list[TaxRegion]:
    regions: list[TaxRegion] = []
    reader = shapefile.Reader(str(shp_path))
    try:
        for shape_record in reader.iterShapeRecords():
            raw_code = str(shape_record.record["REP_CODE"]).strip()
            if not raw_code:
                continue
            reporting_code = normalize_reporting_code(raw_code)
            shape = shape_record.shape
            if not shape.points or not shape.parts:
                continue
            bbox = shape.bbox
            regions.append(
                TaxRegion(
                    region_type=region_type,
                    reporting_code=reporting_code,
                    bbox_min_lon=float(bbox[0]),
                    bbox_min_lat=float(bbox[1]),
                    bbox_max_lon=float(bbox[2]),
                    bbox_max_lat=float(bbox[3]),
                    points=[[float(x), float(y)] for x, y in shape.points],
                    parts=[int(part) for part in shape.parts],
                )
            )
    finally:
        reader.close()
    return regions


async def _seed_tax_regions_if_needed(static_dir: Path) -> None:
    city_count = await TaxRegion.filter(region_type=CITY_REGION_TYPE).count()
    county_count = await TaxRegion.filter(region_type=COUNTY_REGION_TYPE).count()

    to_insert: list[TaxRegion] = []
    if city_count == 0:
        to_insert.extend(
            _load_tax_regions_from_shp(
                shp_path=static_dir / "shapefiles" / "Cities.shp",
                region_type=CITY_REGION_TYPE,
            )
        )
    if county_count == 0:
        to_insert.extend(
            _load_tax_regions_from_shp(
                shp_path=static_dir / "shapefiles" / "Counties.shp",
                region_type=COUNTY_REGION_TYPE,
            )
        )

    if not to_insert:
        return

    for chunk in _chunked(to_insert, 500):
        await TaxRegion.bulk_create(chunk)


async def _seed_tax_rates_if_needed(static_dir: Path) -> None:
    existing_count = await TaxRate.all().count()
    if existing_count > 0:
        return

    raw = json.loads((static_dir / "ny_tax_rates.json").read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        raise ValueError("Tax rates JSON root must be an object.")

    to_insert: list[TaxRate] = []
    for raw_code, raw_payload in raw.items():
        reporting_code = normalize_reporting_code(str(raw_code))
        jurisdictions = TaxRateByReportingCodeService.parse_rate_payload(
            raw_payload=raw_payload,
            code=reporting_code,
        )
        to_insert.append(
            TaxRate(
                reporting_code=reporting_code,
                jurisdictions=jurisdictions,
            )
        )

    for chunk in _chunked(to_insert, 500):
        await TaxRate.bulk_create(chunk)


async def build_tax_services_from_database() -> tuple[
    ReportingCodeByCoordinatesService, TaxRateByReportingCodeService
]:
    static_dir = Path(__file__).resolve().parents[2] / "static"

    await _seed_tax_regions_if_needed(static_dir=static_dir)
    await _seed_tax_rates_if_needed(static_dir=static_dir)

    city_rows = await TaxRegion.filter(region_type=CITY_REGION_TYPE).values(
        "reporting_code",
        "bbox_min_lon",
        "bbox_min_lat",
        "bbox_max_lon",
        "bbox_max_lat",
        "points",
        "parts",
    )
    county_rows = await TaxRegion.filter(region_type=COUNTY_REGION_TYPE).values(
        "reporting_code",
        "bbox_min_lon",
        "bbox_min_lat",
        "bbox_max_lon",
        "bbox_max_lat",
        "points",
        "parts",
    )
    tax_rate_rows = await TaxRate.all().values("reporting_code", "jurisdictions")

    if not city_rows:
        raise RuntimeError("Tax regions are not loaded in database (city regions missing).")
    if not county_rows:
        raise RuntimeError("Tax regions are not loaded in database (county regions missing).")
    if not tax_rate_rows:
        raise RuntimeError("Tax rates are not loaded in database.")

    reporting_code_service = ReportingCodeByCoordinatesService.from_rows(
        city_rows=city_rows,
        county_rows=county_rows,
    )
    tax_rate_service = TaxRateByReportingCodeService.from_rows(rows=tax_rate_rows)
    return reporting_code_service, tax_rate_service
