import csv
from dataclasses import dataclass
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
    def __init__(self, csv_path: Path | None = None) -> None:
        base_dir = Path(__file__).resolve().parent.parent
        self._csv_path = csv_path or (base_dir / "static" / "taxrates_zip_ny.csv")
        if not self._csv_path.exists():
            raise FileNotFoundError(f"Tax rates file not found: {self._csv_path}")

        self._rates_by_zip = self._load_rates()

    def get_tax_rate_breakdown(self, zip_code: str) -> TaxRateBreakdown | None:
        normalized_zip = self._normalize_zip(zip_code)
        return self._rates_by_zip.get(normalized_zip)

    def _load_rates(self) -> dict[str, TaxRateBreakdown]:
        rates_by_zip: dict[str, TaxRateBreakdown] = {}
        with self._csv_path.open("r", encoding="utf-8", newline="") as file:
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

