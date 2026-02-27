# Plan: Integrate Frontend with Backend API

## Context

The NY Taxes frontend has full UI scaffolding (Orders page, Users page, Layout/sidebar) built with **mock data**. There is no authentication flow, no real API calls, and placeholder routes for Import/Stats. This plan wires every page to the real FastAPI backend and builds the missing features (auth, create order, CSV import, stats, user CRUD).

**Worktree:** `.claude/worktrees/feature-orders-integrate` (branch `feature/orders/integrate` from `dev`)

---

## Phase 1 — Foundation (API Layer + Auth)

### 1.1 Typed API endpoints + request types

**Create** `src/lib/endpoints.ts` — typed wrappers grouped by domain:
- `authApi`: register, login, logout, me
- `ordersApi`: create, list, stats, importCsv, importTasks
- `usersApi`: list, get, create, update, delete

**Modify** `src/lib/api.ts`:
- Add `uploadFile<T>(path, file)` for multipart/form-data (CSV import)
- Add `buildQueryString(params)` helper (strips undefined values)
- Enhance error handling: parse backend `{"detail": "..."}` JSON, throw typed `ApiError(status, detail)`

**Modify** `src/types/index.ts` — add request types:
- `OrderCreateRequest`, `OrdersFilterParams`, `UserCreateRequest`, `UserUpdateRequest`
- `TaxPreviewWsSuccess`, `TaxPreviewWsError` (WS response envelopes)

### 1.2 Login & Register pages

**Create** `src/pages/auth/LoginPage.tsx`, `RegisterPage.tsx`, `schemas.ts`

- Full-page centered card (no sidebar), matches neutral oklch theme
- `react-hook-form` + `zod` validation (login: min 3, password: min 8)
- Login: `POST /auth/login` → setUser in Zustand → navigate `/orders`
- Register: `POST /auth/register` → navigate `/login` with success toast
- Error handling: 401 invalid credentials, 403 inactive, 409 login taken
- Link between login ↔ register

**Note:** zod v4 + `@hookform/resolvers` v5 — verify resolver import path works.

### 1.3 ProtectedRoute + auth initialization

**Create** `src/components/ProtectedRoute.tsx`
- On mount: calls `GET /auth/me` (via React Query `queryKey: ['me']`)
- Loading → full-page spinner; 401 → redirect `/login`; success → setUser + render `<Outlet />`

**Modify** `src/App.tsx` — restructure routes:
```
/login              → LoginPage (public)
/register           → RegisterPage (public)
<ProtectedRoute>    → wraps all below
  <Layout>
    /               → redirect /orders
    /orders         → OrdersPage
    /orders/import  → ImportPage
    /stats          → StatsPage
    /users          → UsersPage
  </Layout>
</ProtectedRoute>
```

### 1.4 Layout — real user data + logout

**Modify** `src/components/Layout.tsx`:
- Replace hardcoded "Admin" with `useAuthStore().user` (initials from full_name/login, real authorities)
- Conditionally show "Users" nav only if user has `read_users` or `edit_users` authority
- Wire "Sign out" → `authApi.logout()` → clearUser → navigate `/login`
- Remove hardcoded `'1.2k'` badge

### 1.5 Shared utility components

**Create:**
- `src/components/Spinner.tsx` — SVG spinner accepting className
- `src/components/ConfirmDialog.tsx` — wraps shadcn `Dialog`, props: title, description, onConfirm, variant (default|destructive)
- `src/components/StatusBadge.tsx` — badge colored by status: done=green, in_progress=blue+pulse, failed=red, pending=muted

**Install** shadcn components: `npx shadcn@latest add progress checkbox alert-dialog`

---

## Phase 2 — Orders Page Integration

### 2.1 React Query hooks

**Create:**
- `src/pages/orders/hooks/useOrders.ts` — `useQuery(['orders', params], ordersApi.list)`
- `src/pages/orders/hooks/useOrdersStats.ts` — `useQuery(['orders-stats', from, to], ordersApi.stats)`

### 2.2 Rewire useOrdersFilter (biggest refactor)

**Rewrite** `src/pages/orders/hooks/useOrdersFilter.ts`:
- Replace `useState` + `MOCK_ORDERS` with `useSearchParams` (URL-based state) + `useOrders` (server-side fetch)
- Filter params from URL: `reporting_code`, `timestamp_from`, `timestamp_to`, `subtotal_min`, `subtotal_max`, `page`, `pageSize`
- Return same shape: `orders`, `total`, `totalPages`, `isLoading`, `refetch`, plus filter getters/setters
- Search input → maps to `reporting_code` server param (backend has no generic text search)

### 2.3 Wire FilterBar, StatsRow, OrdersPage

**Modify** `src/pages/orders/OrdersPage.tsx` — update destructured props from hook (add `isLoading`, `refetch`, rename `paged` → `orders`)

**Modify** `src/pages/orders/components/FilterBar.tsx`:
- Make expanded filter inputs controlled (bound to URL params via useOrdersFilter)
- Add "Max Subtotal" field (backend supports it)
- Wire Refresh button → `refetch()`

**Modify** `src/pages/orders/components/StatsRow.tsx`:
- Replace `MOCK_STATS` with `useOrdersStats(from, to)` (default: current month)
- Compute avg tax rate: `total_tax_amount / total_amount`

### 2.4 Create Order dialog + WS tax preview

**Create:**
- `src/pages/orders/schemas.ts` — zod schema with date validation (>= 2025-03-01)
- `src/pages/orders/hooks/useTaxPreview.ts` — connects `WS /orders/tax/ws`, debounces 500ms, parses `{ok, result|error}` envelope
- `src/pages/orders/components/CreateOrderDialog.tsx` — Dialog with 4 fields + live preview panel showing reporting code, jurisdictions, breakdown, tax/total amounts; error state for outside-NYS coordinates

**Modify** `src/pages/orders/components/PageHeader.tsx` — "New Order" button opens dialog

On submit: `POST /orders` → invalidate `['orders']` → close → success toast

### 2.5 Remove mock data

**Delete** `src/lib/mock-data.ts`, remove all imports of `MOCK_ORDERS`, `MOCK_STATS`, `MOCK_USERS`

---

## Phase 3 — CSV Import Page

### 3.1 Build ImportPage

**Create** `src/pages/import/ImportPage.tsx` + components:
- `UploadSection.tsx` — file input (.csv only), upload button, calls `ordersApi.importCsv(file)` via multipart
    - Show CSV format hint: columns `latitude, longitude, subtotal, timestamp`
    - Show validation note: timestamps < March 1, 2025 or coords outside NYS are treated as errors
- `TasksTable.tsx` + `TaskRow.tsx` — table: ID, File, Status (StatusBadge), Total/Success/Failed rows, progress bar, Created at
- `hooks/useImportTasks.ts` — `useWs('/orders/import/tasks/ws')` for real-time updates; initial load via `GET /orders/import/tasks`
    - On WS message: update React Query cache via `queryClient.setQueryData`
    - Progress bar: `(successful_rows + failed_rows) / total_rows`

---

## Phase 4 — Statistics Page

### 4.1 Build StatsPage

**Create** `src/pages/stats/StatsPage.tsx` + components:
- `DateRangeFilter.tsx` — two date inputs (from/to), default: last 30 days, min: 2025-03-01, format for API: `YYYY.MM.DD` (dots!)
- `SummaryCards.tsx` — 3 cards: Total Orders, Total Revenue ($), Total Tax ($). Reuse `StatCard` pattern from orders page
- `DailyTable.tsx` — columns: Date, Orders, Revenue ($), Tax ($). Rows from `data.daily[]`
- `hooks/useStats.ts` — wraps `useOrdersStats`

---

## Phase 5 — Users Page Integration

### 5.1 Wire to real API

**Create:**
- `src/pages/users/hooks/useUsers.ts` — `useQuery(['users'], usersApi.list)`
- `src/pages/users/schemas.ts` — zod schemas for create/edit user

**Modify** (type change — `UserRow` → real `User` type):
- `UserTableRow.tsx` — `full_name`/`login` instead of `name`/`email`, `authorities` instead of `permissions`, add active/inactive badge
- `UsersTable.tsx` — update columns, use `User` type
- `UsersPage.tsx` — replace `MOCK_USERS` with `useUsers()` hook
- `FilterBarUsers.tsx` — wire search (client-side filter on login/full_name), wire refresh

### 5.2 Create/Edit/Delete user dialogs

**Create:**
- `CreateUserDialog.tsx` — form: login, password, full_name, is_active (Switch), authorities (checkboxes). `POST /users`
- `EditUserDialog.tsx` — same form pre-filled, password optional. `PATCH /users/{id}`

**Modify:**
- `UsersHeader.tsx` — "Add User" button opens CreateUserDialog
- `UserTableRow.tsx` — Edit button opens EditUserDialog, Delete button opens ConfirmDialog → `DELETE /users/{id}`

### 5.3 Authority-based access control

**Create** `src/lib/auth-utils.ts` — `hasAuthority(user, authority)` helper

**Modify:**
- `UsersPage.tsx` — if user lacks `read_users`, show forbidden message
- `UserTableRow.tsx` — show edit/delete only if user has `edit_users`

---

## Phase 6 — Polish

### 6.1 Error boundaries + 404/403

**Create** `src/components/ErrorBoundary.tsx`, `src/pages/NotFoundPage.tsx`, `src/pages/ForbiddenPage.tsx`
**Modify** `src/App.tsx` — add catch-all `*` route, wrap with ErrorBoundary

### 6.2 Global error handling

**Modify** `src/lib/query-client.ts` — add default `onError` that toasts network/500 errors

### 6.3 Visual review

Use Playwright MCP to screenshot each page and verify responsive design + theme consistency

---

## Key Files Summary

| File | Action | Phase |
|------|--------|-------|
| `src/lib/endpoints.ts` | Create | 1.1 |
| `src/lib/api.ts` | Modify (uploadFile, ApiError) | 1.1 |
| `src/types/index.ts` | Modify (request types) | 1.1 |
| `src/pages/auth/LoginPage.tsx` | Create | 1.2 |
| `src/pages/auth/RegisterPage.tsx` | Create | 1.2 |
| `src/components/ProtectedRoute.tsx` | Create | 1.3 |
| `src/App.tsx` | Modify (route restructure) | 1.3 |
| `src/components/Layout.tsx` | Modify (real user, logout) | 1.4 |
| `src/pages/orders/hooks/useOrdersFilter.ts` | Rewrite | 2.2 |
| `src/pages/orders/components/CreateOrderDialog.tsx` | Create | 2.4 |
| `src/pages/orders/hooks/useTaxPreview.ts` | Create | 2.4 |
| `src/pages/import/ImportPage.tsx` | Create | 3.1 |
| `src/pages/stats/StatsPage.tsx` | Create | 4.1 |
| `src/pages/users/UsersPage.tsx` | Modify (real API) | 5.1 |
| `src/pages/users/components/CreateUserDialog.tsx` | Create | 5.2 |
| `src/pages/users/components/EditUserDialog.tsx` | Create | 5.2 |

---

## Verification

After each phase:
1. `npm run build` — no TypeScript errors
2. `npm run dev` — app starts, pages load
3. Playwright MCP screenshot — visual check of layouts
4. Manual test against running backend (`docker compose up` in backend/)
5. Final: `npm run lint` clean, all pages responsive, dark/light theme works
