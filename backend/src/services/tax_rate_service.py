import csv
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


@dataclass(frozen=True)
class TaxRateBreakdown:
    state: str
    zip_code: str
    tax_region_name: str
    estimated_combined_rate: float
    state_rate: float
    estimated_county_rate: float
    estimated_city_rate: float
    estimated_special_rate: float
    risk_level: int


class TaxRateByZipService:
    def __init__(self, rates_dir: Path | None = None) -> None:
        base_dir = Path(__file__).resolve().parent.parent
        self._rates_dir = rates_dir or (base_dir / "static" / "ny_tax_rates")
        if not self._rates_dir.exists() or not self._rates_dir.is_dir():
            raise FileNotFoundError(f"Tax rates directory not found: {self._rates_dir}")

        self._rate_files = self._discover_rate_files()
        if not self._rate_files:
            raise FileNotFoundError(f"No monthly tax rates CSV found in: {self._rates_dir}")

        month_keys = sorted(self._rate_files.keys())
        self._min_month_key = month_keys[0]
        self._max_month_key = month_keys[-1]
        self._cache: dict[tuple[int, int], dict[str, TaxRateBreakdown]] = {}

    def get_tax_rate_breakdown(self, zip_code: str, timestamp: datetime) -> TaxRateBreakdown | None:
        normalized_zip = self._normalize_zip(zip_code)
        month_key = self._resolve_month_key(timestamp)
        rates_by_zip = self._get_rates_by_zip_for_month(month_key)
        return rates_by_zip.get(normalized_zip)

    def _get_rates_by_zip_for_month(self, month_key: tuple[int, int]) -> dict[str, TaxRateBreakdown]:
        cached = self._cache.get(month_key)
        if cached is not None:
            return cached

        file_path = self._rate_files[month_key]
        loaded = self._load_rates(file_path)
        self._cache[month_key] = loaded
        return loaded

    def _load_rates(self, csv_path: Path) -> dict[str, TaxRateBreakdown]:
        rates_by_zip: dict[str, TaxRateBreakdown] = {}
        with csv_path.open("r", encoding="utf-8", newline="") as file:
            reader = csv.DictReader(file)
            for row in reader:
                zip_code = self._normalize_zip(row["ZipCode"])
                rates_by_zip[zip_code] = TaxRateBreakdown(
                    state=row["State"].strip(),
                    zip_code=zip_code,
                    tax_region_name=row["TaxRegionName"].strip(),
                    estimated_combined_rate=float(row["EstimatedCombinedRate"]),
                    state_rate=float(row["StateRate"]),
                    estimated_county_rate=float(row["EstimatedCountyRate"]),
                    estimated_city_rate=float(row["EstimatedCityRate"]),
                    estimated_special_rate=float(row["EstimatedSpecialRate"]),
                    risk_level=int(row["RiskLevel"]),
                )
        return rates_by_zip

    def _discover_rate_files(self) -> dict[tuple[int, int], Path]:
        result: dict[tuple[int, int], Path] = {}
        for csv_file in self._rates_dir.glob("*.csv"):
            try:
                month = datetime.strptime(csv_file.stem, "%Y-%m")
            except ValueError:
                continue
            result[(month.year, month.month)] = csv_file
        return dict(sorted(result.items(), key=lambda item: item[0]))

    def _resolve_month_key(self, timestamp: datetime) -> tuple[int, int]:
        target = (timestamp.year, timestamp.month)
        if target < self._min_month_key:
            raise ValueError(
                f"Timestamp month {self._month_to_str(target)} is earlier than minimum "
                f"available month {self._month_to_str(self._min_month_key)}."
            )
        if target > self._max_month_key:
            return self._max_month_key
        if target in self._rate_files:
            return target

        # If a specific month file is missing in the middle of the range,
        # fallback to the latest available month not later than requested.
        available = [month for month in self._rate_files.keys() if month <= target]
        if not available:
            raise ValueError("No tax rate month available for provided timestamp.")
        return max(available)

    @staticmethod
    def _month_to_str(month_key: tuple[int, int]) -> str:
        year, month = month_key
        return f"{year:04d}-{month:02d}"

    @staticmethod
    def _normalize_zip(zip_code: str) -> str:
        normalized = zip_code.strip()
        if not normalized:
            raise ValueError("ZIP code cannot be empty.")
        if not normalized.isdigit():
            raise ValueError("ZIP code must contain only digits.")
        if len(normalized) > 5:
            raise ValueError("ZIP code must have at most 5 digits.")
        return normalized.zfill(5)
