from dataclasses import dataclass


JurisdictionRateItem = dict[str, str | float]
JurisdictionsPayload = dict[str, list[JurisdictionRateItem]]


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
    def __init__(self, rates_by_code: dict[str, JurisdictionsPayload]) -> None:
        self._rates_by_code = rates_by_code

    @classmethod
    def from_rows(cls, rows: list[dict]) -> "TaxRateByReportingCodeService":
        rates_by_code: dict[str, JurisdictionsPayload] = {}
        for row in rows:
            code = cls.normalize_reporting_code(str(row.get("reporting_code", "")))
            jurisdictions = cls.parse_rate_payload(
                raw_payload=row.get("jurisdictions"),
                code=code,
            )
            rates_by_code[code] = jurisdictions
        return cls(rates_by_code=rates_by_code)

    def get_tax_rate_breakdown(self, reporting_code: str) -> TaxRateBreakdown | None:
        normalized_code = self.normalize_reporting_code(reporting_code)
        payload = self._rates_by_code.get(normalized_code)
        if payload is None:
            return None

        state_rate = round(self._sum_rates(payload["state_rate"]), 5)
        county_rate = round(self._sum_rates(payload["county_rate"]), 5)
        city_rate = round(self._sum_rates(payload["city_rate"]), 5)
        special_rates = round(self._sum_rates(payload["special_rates"]), 5)
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

    @classmethod
    def parse_rate_payload(cls, raw_payload: object, code: str) -> JurisdictionsPayload:
        if not isinstance(raw_payload, dict):
            raise ValueError(f"Invalid tax payload for reporting_code={code}.")

        categories = ("state_rate", "county_rate", "city_rate", "special_rates")
        payload_keys = set(raw_payload.keys())
        missing = [key for key in categories if key not in raw_payload]
        if missing:
            raise ValueError(f"Missing sections {missing} for reporting_code={code}.")
        unknown = sorted(payload_keys.difference(categories))
        if unknown:
            raise ValueError(f"Unknown sections {unknown} for reporting_code={code}.")

        result: JurisdictionsPayload = {}
        for category in categories:
            section = raw_payload.get(category)
            if not isinstance(section, list):
                raise ValueError(
                    f"Tax payload section '{category}' must be an array for reporting_code={code}."
                )
            result[category] = cls._parse_rate_items(
                items=section,
                code=code,
                category=category,
            )
        return result

    @classmethod
    def _parse_rate_items(
        cls,
        items: list[object],
        code: str,
        category: str,
    ) -> list[JurisdictionRateItem]:
        parsed: list[JurisdictionRateItem] = []
        for idx, item in enumerate(items):
            if not isinstance(item, dict):
                raise ValueError(
                    f"Item {idx} in '{category}' must be an object for reporting_code={code}."
                )
            if "name" not in item or "rate" not in item:
                raise ValueError(
                    f"Item {idx} in '{category}' must include 'name' and 'rate' "
                    f"for reporting_code={code}."
                )

            name = str(item["name"]).strip()
            if not name:
                raise ValueError(
                    f"Item {idx} in '{category}' has empty name for reporting_code={code}."
                )
            rate = float(item["rate"])
            parsed.append({"name": name, "rate": rate})
        return parsed

    @staticmethod
    def _sum_rates(items: list[JurisdictionRateItem]) -> float:
        return sum(float(item["rate"]) for item in items)

    @staticmethod
    def normalize_reporting_code(raw_code: str) -> str:
        value = raw_code.strip()
        if not value:
            raise ValueError("Reporting code cannot be empty.")
        if value.isdigit() and len(value) <= 4:
            return value.zfill(4)
        return value
