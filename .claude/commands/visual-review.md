Take a screenshot of the running frontend and review it for design quality: $ARGUMENTS

The argument is an optional route path (e.g. `/orders`, `/stats`). Default to `/orders` if omitted.

The dev server runs at `http://localhost:5173`. Construct the full URL from the argument.

## Steps

1. Use the Playwright MCP to navigate to the URL and take a full-page screenshot.
2. Review the screenshot against the criteria below.
3. Produce a structured report (see format below).

## Review criteria

### Theme consistency
- All interactive elements use neutral/zinc tones — no amber, emerald, indigo, or other accent colours unless they are intentional semantic signals (e.g. destructive red)
- Text uses `text-foreground` / `text-muted-foreground` hierarchy — check that secondary text is visually dimmer
- Backgrounds follow the layered depth pattern: sidebar is slightly lighter/darker than main, cards sit above page background
- Border colours are subtle — not too heavy, consistent across the page

### Dark mode correctness
- Page looks intentionally dark — no white or very light backgrounds bleeding through
- No unstyled / default browser elements visible
- Images, icons, and illustrations (if any) suit dark contexts

### Spacing & layout
- Content has consistent horizontal padding (the project uses `px-8`)
- Vertical rhythm is regular — headings, rows, cards don't feel cramped or overly spaced
- The sidebar does not overlap main content
- Tables and lists align cleanly

### Component usage
- shadcn/ui primitives are used where appropriate (Button, Badge, Tooltip, etc.) — no DIY re-implementations of things shadcn already provides
- Loading skeletons present for async data
- Empty states present for zero-data scenarios

### Typography
- Font sizes follow a clear hierarchy (page title > section label > body > caption)
- No walls of same-size text

### Interaction affordances
- Clickable elements are visually distinct (cursor, hover state)
- Focus rings visible for keyboard navigation

## Report format

Return a structured report with these sections:

**Screenshot taken:** `<url>`

**Overall impression:** 1–2 sentence summary.

**Passes:** bullet list of things that look good.

**Issues:** bullet list of specific problems found, each with:
  - What: description of the problem
  - Where: element / component / area of the page
  - Suggested fix: concrete code-level recommendation

**Quick wins:** up to 3 highest-impact fixes that could be done immediately, ranked by visual impact.

If no issues are found, say so clearly and note what makes the design successful.
