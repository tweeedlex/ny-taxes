# New York Sales Tax by Delivery Location (Geo-Based Engine)

This monorepo implements a New York State (NYS) sales tax system that calculates tax by delivery coordinates.

Instead of ZIP-based matching, the engine uses NYS reporting codes mapped to geospatial boundaries (city first, then county).

## Historical Context: How We Got Here

### Problem

We needed to compute tax for a delivery point (`latitude`, `longitude`) and return:

- `composite_tax_rate`
- `tax_amount = subtotal * composite_tax_rate`
- `total_amount = subtotal + tax_amount`
- breakdown: `state_rate`, `county_rate`, `city_rate`, `special_rates`

### Why We Didn’t Stay with ZIP-Based Rates

At first we tested ZIP datasets (including [Avalara tax tables](https://www.avalara.com/taxrates/en/download-tax-tables.html)), but accuracy was not stable enough near jurisdiction boundaries and mixed ZIP areas.

### Official Tax Source

We use [NYS Publication 718](https://www.tax.ny.gov/pdf/publications/sales/pub718.pdf) as the source of reporting-code tax data.

### Geospatial Layer (Reporting Code -> Polygon)

To make location-based taxation deterministic, we prepared NY boundary layers and mapped reporting codes onto polygons.

Data sources we used in this process:
- [US Census TIGER/Line shapefiles](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html)
- [NYS GIS Civil Boundaries](https://gis.ny.gov/civil-boundaries)
- [NYS data portal](https://data.gis.ny.gov/)

Why multiple sources: county and civil boundary layers can differ in completeness/representation, so they were reconciled during dataset preparation.

### Reporting Code Assignment

Publication 718 rates are keyed by reporting code. We mapped reporting codes to matching geospatial units so polygons contain `REP_CODE`.

### Handling NYS + MCTD + Local Shares

Publication 718 gives state rate, possible MCTD rate, and composite rate for a reporting code.
During data preparation, local share can be derived as:

```text
local_rate = composite_rate - state_rate - mctd_rate(if applicable)
```

### Coastal / Offshore Note

NYS tax jurisdiction in near-shore areas (including 3 nautical miles context) is treated through prepared boundary data.
No separate offshore runtime layer is used in the current backend logic.

### Validation Against Official NYS Lookup

Results are checked against [NYS Jurisdiction/Rate Lookup](https://www8.tax.ny.gov/JRLA/jrlaStart).

## Current Implementation in This Repo

### Monorepo Layout

- `backend/` - FastAPI API + tax engine + imports pipeline.
- `frontend/` - optional React/Vite app.

### Backend Runtime Overview

- Auth via `login + password`.
- Sessions in Redis (`HttpOnly` cookie, no JWT).
- Authorities:
  - `read_users`
  - `edit_users`
  - `read_orders`
  - `edit_orders`
- Postgres + Tortoise ORM.
- CSV import files stored in MinIO.
- Static files served from `backend/src/static` (`index.html`, `map.html`).

## Tax Engine Logic (Actual Runtime)

1. Validate payload and coordinates.
2. Validate timestamp date is not earlier than `2025-03-01`.
3. Find reporting code by coordinates:
   - `backend/src/static/shapefiles/Cities.shp`
   - fallback: `backend/src/static/shapefiles/Counties.shp`
4. If not found -> `422` (`outside New York State coverage`).
5. Load rates from `backend/src/static/ny_tax_rates.json`.
6. Compute and return totals and breakdown.

## Tax Rates JSON Format (Current)

```json
{
  "6511": {
    "state_rate": [
      {
        "rate": 0.04,
        "name": "New York State"
      }
    ],
    "county_rate": [
      {
        "rate": 0.04,
        "name": "Westchester"
      }
    ],
    "city_rate": [
      {
        "rate": 0.005,
        "name": "Yonkers"
      }
    ],
    "special_rates": [
      {
        "rate": 0.00375,
        "name": "MCTD"
      }
    ]
  }
}
```

Rules:
- all 4 sections are required;
- each section is an array of objects with `name` and `rate`.

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env
docker-compose up --build -d
```

Backend URLs:
- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`
- Static UI: `http://localhost:8000/static/index.html`
- Map UI: `http://localhost:8000/static/map.html`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

### Frontend (optional)

```bash
cd frontend
docker-compose up --build -d
```

Frontend URL:
- `http://localhost:3000`

## API Surface

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

### Users

- `GET /users` (`read_users`)
- `GET /users/{id}` (`read_users`)
- `POST /users` (`edit_users`)
- `PATCH /users/{id}` (`edit_users`)
- `DELETE /users/{id}` (`edit_users`)

### Orders

- `POST /orders` (`edit_orders`) - calculates tax and persists order.
- `GET /orders` (`read_orders`) - pagination + filters (`reporting_code`, `timestamp_from`, `timestamp_to`, `subtotal_min`, `subtotal_max`).
- `GET /orders/stats` (`read_orders`) - `from_date`, `to_date` (`YYYY.MM.DD`), aggregation by `timestamp`.

### Import

- `POST /orders/import` (`edit_orders`) - upload CSV, create background task.
- `GET /orders/import/tasks` (`read_orders`) - list all tasks.
- `WS /orders/import/tasks/ws` (`read_orders`) - stream tasks updates.

### Public Tax Preview WS

- `WS /orders/tax/ws` - no auth.
- Same payload shape as `POST /orders`.
- Computes tax preview only, no DB write.

## CSV Import Behavior

- Required columns: `longitude`, `latitude`, `timestamp`, `subtotal`.
- Column order can be any; extra columns are ignored.
- Header matching is normalized (case/underscore/space tolerant).
- Invalid rows are skipped and counted as failed.
- If remaining rows > 100: split into 5 chunks and process in parallel.
- Valid rows are inserted via `Order.bulk_create(...)` in batches of 500.
- Task progress is updated every 30 processed rows.
- On restart, `in_progress` tasks resume from `successful_rows + failed_rows + 1`.

## Date Validation Rule

Minimum supported date: `2025-03-01`.

Applied in:
- `POST /orders` (`timestamp`)
- `WS /orders/tax/ws` (`timestamp`)
- `POST /orders/import` (row `timestamp`)
- `GET /orders` (`timestamp_from`, `timestamp_to`)
- `GET /orders/stats` (`from_date`, `to_date`)

## Persistence Model

`orders` stores both input and computed output fields, including:
- location + subtotal + timestamp
- `reporting_code`, `jurisdictions`
- `composite_tax_rate`, `tax_amount`, `total_amount`
- tax breakdown fields
- order author (`user`)

`file_tasks` stores import execution state:
- `file_path`, `total_rows`, `successful_rows`, `failed_rows`, `status`, `user`

## Notes / Limitations

- Reporting codes and rates must be synchronized with Publication 718 updates.
- Project currently targets standard sales tax flow; product-specific exemptions/rules are out of scope.
- `MINIO_PUBLIC_BASE_URL` controls public URL format in returned `file_path`.

## Sources

- [Avalara tax tables](https://www.avalara.com/taxrates/en/download-tax-tables.html)
- [NYS Publication 718](https://www.tax.ny.gov/pdf/publications/sales/pub718.pdf)
- [TIGER/Line shapefiles](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html)
- [NYS GIS Civil Boundaries](https://gis.ny.gov/civil-boundaries)
- [NYS data portal](https://data.gis.ny.gov/)
- [NYS Jurisdiction/Rate Lookup](https://www8.tax.ny.gov/JRLA/jrlaStart)
