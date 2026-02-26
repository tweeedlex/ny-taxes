Scaffold a new page for the frontend: $ARGUMENTS

The argument is the page name in kebab-case (e.g. `csv-import`, `stats`, `users`).
Derive a PascalCase name (e.g. `CsvImport`, `Stats`, `Users`) and a camelCase hook name (e.g. `useCsvImport`).

## File structure to create

Follow the exact pattern established by `frontend/src/pages/orders/`. Create:

```
frontend/src/pages/<name>/
  <Name>Page.tsx          ← thin orchestrator, no local state
  hooks/use<Name>.ts      ← all state, data fetching, derived values
  components/
    PageHeader.tsx        ← page title + primary action buttons
  utils/
    formatters.ts         ← formatting helpers (may start empty)
```

### `<Name>Page.tsx` shape
- Import and call the hook, destructure what's needed
- Render composed child components — no logic or JSX complexity here
- Wrap with `<TooltipProvider delayDuration={200}>` if the page uses tooltips
- Use `<div className="min-h-screen flex flex-col">` as root

### `hooks/use<Name>.ts` shape
- All `useState`, `useMemo`, `useQuery`, `useWebSocket` calls live here
- Return a flat object of values and setters
- Follow the `useOrdersFilter` pattern: co-locate derived/computed values inside the hook

### `components/PageHeader.tsx` shape
- Accept no props or minimal props
- Show the page title and any primary action buttons (New X, Export, etc.)
- Use `<div className="px-8 py-6 flex items-center justify-between border-b border-border">` as root

### `utils/formatters.ts`
- Export pure formatting functions (currency, date, percentage, etc.)
- Reference `frontend/src/pages/orders/utils/formatters.ts` for examples

## Wiring into the app

1. Open `frontend/src/App.tsx` and replace the stub `<div>` placeholder for this route with `<NamePage />`. Add the import.
2. If the page is NOT yet listed in `App.tsx` routes, add a new `<Route>` under the `<Route element={<Layout />}>` group.
3. If the page is NOT yet listed in `NAV_ITEMS` in `frontend/src/components/Layout.tsx`, add an entry with an appropriate lucide-react icon and label. Available routes already in the nav: `/orders`, `/orders/import`, `/stats`, `/users`.

## Constraints
- Match the neutral theme: no amber/emerald color classes; use `text-foreground`, `text-muted-foreground`, `bg-secondary`, `bg-primary`, zinc scale for decorative elements
- Dark mode is always active (`class="dark"` on `<html>`) — do not add light-mode variants
- Use shadcn/ui components from `frontend/src/components/ui/` — do not add inline styles for things shadcn already handles
- Do not add features not implied by the page name — create stubs/TODOs for data that doesn't exist yet

## After scaffolding
- Summarise the files created and what each is responsible for
- List any TODOs left for the developer (e.g. "connect useQuery to real API endpoint")
- Run `npm run build` inside `frontend/` to confirm no TypeScript errors, fix any that appear
