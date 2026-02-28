def normalize_reporting_code(raw_code: str) -> str:
    value = raw_code.strip()
    if not value:
        raise ValueError("Reporting code cannot be empty.")
    if len(value) > 32:
        raise ValueError("reporting_code must have at most 32 characters")
    if value.isdigit() and len(value) <= 4:
        return value.zfill(4)
    return value
