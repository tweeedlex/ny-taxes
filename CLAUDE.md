# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NY Taxes is a full-stack app for calculating New York State sales tax by GPS coordinates. It uses shapefiles to map coordinates to a reporting code, then looks up the corresponding tax rates.

## Commands

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn src.main:app --reload        # dev server on :8000
docker compose up --build            # full stack via Docker
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev       # Vite dev server on :5173
npm run build     # tsc + vite build
npm run lint      # ESLint
npx playwright test                  # e2e tests (requires dev server running)
```

## Architecture

### Backend (`backend/src/`)

**FastAPI** app with async stack: Tortoise ORM → PostgreSQL, Redis sessions, MinIO file storage.

- `main.py` — lifespan startup: DB, Redis, MinIO, services, bootstrap admin, resume in-progress import tasks
- `api/deps.py` — FastAPI dependency injection: services, session manager, `get_current_user`, `require_authority()`
- `api/routes/` — `auth.py`, `users.py`, `orders.py`
- `core/` — `config.py` (pydantic-settings), `sessions.py` (Redis UUID sessions + HttpOnly cookie), `authorities.py`, `storage.py` (MinIO), `bootstrap.py`
- `services/` — `reporting_code_service.py` (shapefile point-in-polygon, EPSG:4326→26918), `tax_rate_service.py` (loads `static/ny_tax_rates.json`)
- `models/` — `User`, `Order`, `FileTask` (Tortoise ORM)
- `schemas/` — Pydantic v2 request/response schemas

**Auth**: session-based with Redis. Cookie `session_id` set on login/register. Authorities are a JSON string array on the User model: `read_users`, `edit_users`, `read_orders`, `edit_orders`. Bootstrap admin is created on startup from env vars.

**Tax calculation flow**: coordinates → `ReportingCodeByCoordinatesService` (Cities shapefile first, then Counties) → reporting code → `TaxRateByReportingCodeService` (JSON lookup) → rates summed per category.

**CSV import**: uploaded to MinIO, `FileTask` record created, background `asyncio.create_task` processes rows. Parallel processing (5 chunks via `asyncio.to_thread`) for >100 rows. Batch inserts per 500 rows. Progress pushed via WebSocket (`WS /orders/import/tasks/ws`). In-progress tasks are resumed on startup.

**Real-time tax preview**: `WS /orders/tax/ws` — accepts coordinate+subtotal, responds with tax breakdown without persisting an order.

### Frontend (`frontend/src/`)

**React 19 + Vite** SPA. Early-stage: routing and providers are set up, UI components exist, but most pages are not yet built.

- `lib/api.ts` — HTTP client wrapping `fetch` with `credentials: 'include'` (cookie auth). Base URL from `VITE_API_URL`.
- `lib/query-client.ts` — React Query singleton, 30s staleTime, 1 retry.
- `store/auth.store.ts` — Zustand store for current user state.
- `providers/index.tsx` — wraps app with QueryClientProvider + Toaster.
- `hooks/use-ws.ts` — WebSocket hook (wraps react-use-websocket).
- `components/ui/` — shadcn-style components (button, card, form, input, label).

**Env vars** (baked at build time): `VITE_API_URL`, `VITE_WS_URL`.

Frontend development guidelines:
- Use and create reusable components
- When building complex reusable component, consider using the React Compound Component Pattern for flexibility.
- Use hooks for state and side effect management in functional components.
- Follow the SOLID principles for clean, maintainable code.
- Use the playwright MCP server when designing layouts to take a view of the results

### Static Data
`backend/src/static/ny_tax_rates.json` — tax rates keyed by reporting code.
`backend/src/static/shapefiles/Cities.*`, `Counties.*` — NY boundary shapefiles.

### Docker
- `backend/docker-compose.yml` — API + PostgreSQL + Redis + MinIO + MinIO-init (bucket creation)
- `frontend/docker-compose.yml` — nginx on port 3000 serving the built frontend
- `frontend/nginx.conf` — SPA routing with `try_files` fallback to `index.html`