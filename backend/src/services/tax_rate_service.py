import json
from dataclasses import dataclass
from pathlib import Path


RateByJurisdiction = dict[str, float]
JurisdictionsPayload = dict[str, RateByJurisdiction]


@dataclass(frozen=True)
class TaxRateBreakdown:
    reporting_code: str
    jurisdictions: JurisdictionsPayload
    state_rate: float
    county_rate: float
    city_rate: float
    special_rates: float
    composite_tax_rate: float


class TaxRateByReportingCodeService:
    def __init__(self, rates_path: Path | None = None) -> None:
        base_dir = Path(__file__).resolve().parent.parent
        self._rates_path = rates_path or (base_dir / "static" / "ny_tax_rates.json")
        if not self._rates_path.exists():
            raise FileNotFoundError(f"Tax rates file not found: {self._rates_path}")
        self._rates_by_code = self._load_rates()

    def get_tax_rate_breakdown(self, reporting_code: str) -> TaxRateBreakdown | None:
        normalized_code = self._normalize_reporting_code(reporting_code)
        payload = self._rates_by_code.get(normalized_code)
        if payload is None:
            return None

        state_rate = round(sum(payload["state_rate"].values()), 5)
        county_rate = round(sum(payload["county_rate"].values()), 5)
        city_rate = round(sum(payload["city_rate"].values()), 5)
        special_rates = round(sum(payload["special_rates"].values()), 5)
        composite_tax_rate = round(state_rate + county_rate + city_rate + special_rates, 5)

        return TaxRateBreakdown(
            reporting_code=normalized_code,
            jurisdictions=payload,
            state_rate=state_rate,
            county_rate=county_rate,
            city_rate=city_rate,
            special_rates=special_rates,
            composite_tax_rate=composite_tax_rate,
        )

    def _load_rates(self) -> dict[str, JurisdictionsPayload]:
        raw = json.loads(self._rates_path.read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            raise ValueError("Tax rates JSON root must be an object.")

        rates_by_code: dict[str, JurisdictionsPayload] = {}
        for raw_code, raw_payload in raw.items():
            code = self._normalize_reporting_code(str(raw_code))
            rates_by_code[code] = self._parse_rate_payload(raw_payload, code)
        return rates_by_code

    def _parse_rate_payload(self, raw_payload: object, code: str) -> JurisdictionsPayload:
        if not isinstance(raw_payload, dict):
            raise ValueError(f"Invalid tax payload for reporting_code={code}.")

        categories = ("state_rate", "county_rate", "city_rate", "special_rates")
        result: JurisdictionsPayload = {}
        for category in categories:
            section = raw_payload.get(category, {})
            if not isinstance(section, dict):
                raise ValueError(
                    f"Tax payload section '{category}' must be an object for reporting_code={code}."
                )
            result[category] = {
                str(jurisdiction): float(rate) for jurisdiction, rate in section.items()
            }
        return result

    @staticmethod
    def _normalize_reporting_code(raw_code: str) -> str:
        value = raw_code.strip()
        if not value:
            raise ValueError("Reporting code cannot be empty.")
        if value.isdigit() and len(value) <= 4:
            return value.zfill(4)
        return value
