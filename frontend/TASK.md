# Frontend Task — NY Taxes Admin Panel

## Business Context

NY Taxes is a service that delivers wellness kits by drone anywhere in New York State. Sales tax was not accounted for at launch, so this admin panel exists to:
- Retroactively calculate and record tax on past orders (CSV import)
- Calculate tax on new orders in real time (manual entry)
- Browse, filter, and analyse all orders with full tax breakdown

Tax is determined by GPS coordinates (lat/lon) → reporting code → composite rate (state + county + city + special).

---

## Current State

The following scaffolding is **already in place** — do not recreate it:

| File | What it does |
|---|---|
| `src/lib/api.ts` | `fetch` wrapper with `credentials: 'include'` (cookie auth). Methods: `api.get`, `api.post`, `api.patch`, `api.delete`. Base URL from `VITE_API_URL`. |
| `src/lib/query-client.ts` | React Query singleton (30 s staleTime, 1 retry). |
| `src/store/auth.store.ts` | Zustand store: `user`, `setUser`, `clearUser`. |
| `src/providers/index.tsx` | `<Providers>` — wraps with QueryClientProvider + Toaster. |
| `src/hooks/use-ws.ts` | `useWs(path, options?)` — wraps `react-use-websocket`. Base URL from `VITE_WS_URL`. |
| `src/components/ui/` | shadcn-style: Button, Card, Form, Input, Label. |
| `src/App.tsx` | BrowserRouter + single placeholder route `/`. |
| `src/types/index.ts` | Stub `User` type — **needs full replacement** (see Types section). |

---

## API Note
The backend API is already implemented and origin URLs are accesible via `VITE_API_URL` and `VITE_WS_URL`. The API client in `src/lib/api.ts` has basic wrappers for making requests with cookie auth, but you will need to add typed endpoint functions for each route (e.g. `login`, `fetchOrders`, etc.) that call these wrappers with the correct method, URL, and request body.
If something is unclear, refer to the OpenAPI schema in `misc/openapi.json` for request/response details. Also you can observe the backend to understand the expected data shapes and error handling.
The backend is available via VITE_API_URL, the data with all tax rates is available via {VITE_API_URL}/static/ny_tax_rates.json

# Notes from the backend developer:
треба написать
шо при предполагаєм шо у нас в кіті нема підакцизних товарів
не забуть для дат додать валідацію
не раніше 1 березня 2025
і коли загружаєш файл
в модалці
писать шо помилковими вважаються ті коордлинати, в яких таймстамп менше 1 березня 2025 або вони знаходяться не в НЙШ

## Types to Define (`src/types/index.ts`)

Replace the stub with types derived from the OpenAPI schema:

```ts
// Auth / Users
export interface User {
  id: number
  login: string
  full_name: string | null
  is_active: boolean
  authorities: string[]   // 'read_users' | 'edit_users' | 'read_orders' | 'edit_orders'
  created_at: string
  updated_at: string
}

// Tax breakdown
export interface TaxBreakdown {
  state_rate: number
  county_rate: number
  city_rate: number
  special_rates: number
}

export interface JurisdictionRateItem {
  name: string
  rate: number
}

// Orders
export interface Order {
  id: number
  author_user_id: number | null
  author_login: string | null
  latitude: number
  longitude: number
  subtotal: number
  timestamp: string
  reporting_code: string
  jurisdictions: Record<string, JurisdictionRateItem[]>
  composite_tax_rate: number
  tax_amount: number
  total_amount: number
  breakdown: TaxBreakdown
  created_at: string
}

export interface OrdersListResponse {
  total: number
  limit: number
  offset: number
  items: Order[]
}

export interface OrderTaxCalculationResponse {
  order_id: number
  author_user_id: number | null
  author_login: string | null
  reporting_code: string
  jurisdictions: Record<string, JurisdictionRateItem[]>
  composite_tax_rate: number
  tax_amount: number
  total_amount: number
  breakdown: TaxBreakdown
}

// CSV import tasks
export interface FileTask {
  id: number
  user_id: number
  file_path: string
  total_rows: number
  successful_rows: number
  failed_rows: number
  status: string   // 'pending' | 'in_progress' | 'done' | 'failed'
  created_at: string
  updated_at: string
}

// Stats
export interface OrdersStatsDay {
  date: string
  total_amount: number
  total_tax_amount: number
  total_orders: number
}

export interface OrdersStatsResponse {
  from_date: string
  to_date: string
  total_amount: number
  total_tax_amount: number
  total_orders: number
  daily: OrdersStatsDay[]
}
```

---

## API Client (`src/lib/api.ts`)

Add typed wrappers (or a separate `src/lib/endpoints.ts`) for every backend endpoint. The underlying `api.*` helpers already handle cookies and error throwing.

### Auth
```ts
// POST /auth/register  body: { login, password, full_name? }  → User
// POST /auth/login     body: { login, password }              → User
// POST /auth/logout                                           → void (204)
// GET  /auth/me                                               → User
```

### Orders
```ts
// POST /orders         body: { latitude, longitude, subtotal, timestamp } → OrderTaxCalculationResponse
// GET  /orders         query: limit, offset, reporting_code?, timestamp_from?, timestamp_to?,
//                             subtotal_min?, subtotal_max?                → OrdersListResponse
// POST /orders/import  multipart: file (CSV)                             → { task: FileTask }
// GET  /orders/stats   query: from_date (YYYY.MM.DD), to_date            → OrdersStatsResponse
// GET  /orders/import/tasks                                               → FileTask[]
```

Note: `POST /orders/import` uses `multipart/form-data`. Do **not** use `api.post` for this — build the request manually with `FormData` and `fetch` (still with `credentials: 'include'`).

### Users
```ts
// GET    /users               query: limit, offset          → User[]
// POST   /users               body: { login, password, full_name?, is_active?, authorities? } → User
// GET    /users/{id}                                         → User
// PATCH  /users/{id}          body: partial User fields     → User
// DELETE /users/{id}                                         → void (204)
```

### WebSocket paths
```ts
// WS /orders/import/tasks/ws  — real-time FileTask progress updates (JSON messages)
// WS /orders/tax/ws           — send { latitude, longitude, subtotal } → receive TaxBreakdown preview
```
Use the existing `useWs` hook for both.

---

## Routing

Replace `App.tsx` with the following route tree. Use `react-router-dom` v7 (`BrowserRouter` + `Routes`/`Route`).

```
/login                  → LoginPage       (public)
/register               → RegisterPage    (public, optional — only if auth is implemented)

/                       → redirect to /orders

/orders                 → OrdersPage      (protected)
/orders/import          → ImportPage      (protected)
/stats                  → StatsPage       (protected)
/users                  → UsersPage       (protected, authority: edit_users)
```

Create a `<ProtectedRoute>` wrapper that calls `GET /auth/me` on mount (via React Query), stores the result in the Zustand auth store, and redirects to `/login` if the request returns 401.

---

## Features

---

### Feature 1 — Authentication

**Routes:** `/login`, `/register`

#### Login page (`src/pages/auth/LoginPage.tsx`)
- Form fields: `login` (string, min 3), `password` (string, min 8)
- Validate with `react-hook-form` + `zod`
- On submit: `POST /auth/login` → store user in Zustand → redirect to `/orders`
- On error: show toast with the error message
- Link to `/register`

#### Register page (`src/pages/auth/RegisterPage.tsx`)
- Fields: `login`, `password`, `full_name` (optional)
- Same form/validation pattern as login
- On success: redirect to `/login` with success toast

#### Auth guard (`src/components/ProtectedRoute.tsx`)
- On mount: call `GET /auth/me` (React Query, `queryKey: ['me']`)
- If loading: show a centered spinner
- If 401 / error: redirect to `/login`
- If ok: render `<Outlet />` and populate Zustand store

#### Logout
- Button in nav/header: `POST /auth/logout` → clear Zustand store → redirect to `/login`

---

### Feature 2 — Orders List

**Route:** `/orders`

#### Page (`src/pages/orders/OrdersPage.tsx`)

**Table columns:**
| Column | Value |
|---|---|
| ID | `order.id` |
| Timestamp | formatted date/time |
| Author | `order.author_login ?? '—'` |
| Coordinates | `lat, lon` (4 decimal places) |
| Reporting Code | `order.reporting_code` |
| Subtotal | `$subtotal` |
| Tax Rate | `(composite_tax_rate * 100).toFixed(4)%` |
| Tax Amount | `$tax_amount` |
| Total | `$total_amount` |
| Breakdown | state / county / city / special (tooltip or expandable row) |

**Filters (query params, sync with URL search params):**
- `reporting_code` — text input
- `timestamp_from` / `timestamp_to` — datetime-local inputs
- `subtotal_min` / `subtotal_max` — number inputs

**Pagination:**
- Page size selector: 10 / 25 / 50
- Previous / Next buttons
- Show "X–Y of Z orders"
- Controlled by `limit` + `offset`; derive from `total` in response

**Data fetching:** React Query, `queryKey: ['orders', filters, page]`. Invalidate on new order creation or CSV import completion.

**Expandable row / Breakdown tooltip:**
Show `TaxBreakdown` (state_rate, county_rate, city_rate, special_rates) and the `jurisdictions` map when user clicks a row or hovers a breakdown cell.

---

### Feature 3 — Manual Order Creation

**Trigger:** "New Order" button on `/orders`, opens a modal or a side panel.

#### Form (`src/components/orders/CreateOrderForm.tsx`)
Fields validated with `react-hook-form` + `zod`:

| Field | Type | Constraints |
|---|---|---|
| `latitude` | number | −90 to 90 |
| `longitude` | number | −180 to 180 |
| `subtotal` | number | ≥ 0 |
| `timestamp` | datetime-local | required |

**Live tax preview via WebSocket:**
- Connect to `WS /orders/tax/ws` while the form is open
- Debounce (400 ms) sending `{ latitude, longitude, subtotal }` whenever those fields change and are valid
- Display the preview `TaxBreakdown` + `composite_tax_rate` beneath the form in real time
- Preview panel is read-only; it disappears while waiting for a response

**On submit:** `POST /orders` → show success toast with `order_id` + `composite_tax_rate` → close modal → invalidate `['orders']` query.

---

### Feature 4 — CSV Import

**Route:** `/orders/import`

#### Upload section (`src/pages/orders/ImportPage.tsx`)
- File input accepting `.csv` files only
- "Upload" button — disabled until a file is selected
- On upload: `POST /orders/import` (multipart) → returns `{ task: FileTask }` → add task to the list below

#### CSV format
The CSV must have columns: `latitude`, `longitude`, `subtotal`, `timestamp`. Show this info as a hint near the file input. Provide a sample CSV download link or inline example.

#### Import tasks table
- Fetched via `GET /orders/import/tasks` on page load (React Query)
- Columns: ID, File, Status, Total / Success / Failed rows, Created at
- **Real-time updates** via `WS /orders/import/tasks/ws`:
  - Connect when the page mounts
  - On each message (JSON `FileTask`): update the matching task in the React Query cache (`queryClient.setQueryData`)
  - Show a progress bar: `successful_rows + failed_rows` out of `total_rows`
- Status badge colour: pending=grey, in_progress=blue, done=green, failed=red

---

### Feature 5 — Stats

**Route:** `/stats`

#### Page (`src/pages/stats/StatsPage.tsx`)

**Date range picker:**
- `from_date` and `to_date` inputs (date type, format `YYYY.MM.DD` for the API)
- Default: last 30 days
- "Apply" button triggers query

**Summary cards (top row):**
- Total Orders
- Total Amount ($)
- Total Tax Amount ($)

**Daily breakdown table:**
| Date | Orders | Amount | Tax Amount |
|---|---|---|---|

All values formatted with 2 decimal places for money.

---

### Feature 6 — Users Management

**Route:** `/users`
**Visibility:** only show nav link if current user has authority `edit_users`.

#### Users table (`src/pages/users/UsersPage.tsx`)
Columns: ID, Login, Full Name, Active (badge), Authorities, Created at, Actions.

Actions: Edit (opens modal), Delete (confirm dialog).

**Create user button** → opens `CreateUserForm` modal:
- Fields: `login`, `password`, `full_name` (optional), `is_active` (checkbox, default true), `authorities` (multi-select: `read_users`, `edit_users`, `read_orders`, `edit_orders`)
- `POST /users`

**Edit user modal** (`EditUserForm`):
- Same fields except password is optional (omit if blank)
- `PATCH /users/{id}`

**Delete:** `DELETE /users/{id}` with confirm dialog → toast.

Pagination: `limit=100&offset=0` (simple, server has max 1000).

---

## Shared Components to Build

| Component | Path | Purpose |
|---|---|---|
| `Layout` | `src/components/Layout.tsx` | Nav sidebar/topbar with links (Orders, Import, Stats, Users), current user display, logout button |
| `Spinner` | `src/components/Spinner.tsx` | Centered loading indicator |
| `ConfirmDialog` | `src/components/ConfirmDialog.tsx` | Reusable "are you sure?" dialog |
| `Pagination` | `src/components/Pagination.tsx` | Prev/Next + page info, accepts `total`, `limit`, `offset`, `onChange` |
| `StatusBadge` | `src/components/StatusBadge.tsx` | Coloured badge for FileTask status |
| `TaxBreakdownCard` | `src/components/TaxBreakdownCard.tsx` | Renders state/county/city/special rates + jurisdiction list |

## Dev Tools Reference

All commands run from the `frontend/` directory.

| Command | What it does |
|---|---|
| `npm install` | Install all dependencies |
| `npm run dev` | Start Vite dev server on **http://localhost:5173** (hot reload) |
| `npm run build` | Type-check with `tsc -b`, then produce optimised build in `dist/` |
| `npm run lint` | Run ESLint across all source files |
| `npx playwright test` | Run end-to-end tests (requires `npm run dev` to be running first) |
| `npm run preview` | Serve the production `dist/` build locally for manual testing |

Playwright tests live in `frontend/` (look for `*.spec.ts` files). The dev server must be running on port 5173 before executing them.

React Query DevTools are included in development builds — open the floating button in the bottom-left corner to inspect cache state.

---

## UI language and design
- All the UI text should be in English.
- Follow the existing design patterns in the app, using shadcn/ui components and Tailwind
- Use the colors from the tailwind config (`text-foreground`, `bg-primary`, etc.) for consistency. Avoid introducing new colors if possible
- All the pages should be responsive and look good on both desktop and mobile screen sizes. Use Tailwind's responsive utilities to achieve this.

## Implementation Order (suggested)

1. **Types** — update `src/types/index.ts`
2. **API endpoints** — add typed wrappers in `src/lib/api.ts` or a new `src/lib/endpoints.ts`
3. **Auth pages + ProtectedRoute** — unblocks everything else
4. **Layout + routing** — wire up all routes behind the guard
5. **Orders list** — most critical feature; covers GET /orders with filters + pagination
6. **Manual order creation** — POST /orders + WebSocket preview
7. **CSV import page** — POST /orders/import + WS progress
8. **Stats page** — GET /orders/stats
9. **Users page** — CRUD behind authority check
