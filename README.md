# tanstack-table-mui

A demo for testing the capabilities and performance of **TanStack Table v9** with **MUI**, using a fully server-driven data grid. It is meant to grow into a component library later; for now it is a client app plus a mock backend.

```
client/   React 19 + Bun (bundler + dev server) + TanStack Table/Query/Virtual + MUI
server/   Small Node HTTP server (run with Bun) with 100k mock orders × 65 fields
```

## Run

```sh
bun install
bun run dev          # starts server (:3001) and client (:5173)
bun run typecheck
```

Server options (env): `MOCK_ROWS` (default `100000`), `MOCK_LATENCY_MS` (default `150`), `PORT` (default `3001`).
The client dev server (`client/serve.ts`, `Bun.serve` with HTML imports and HMR) proxies `/api/*` to the server and strips the prefix. `bun run --filter client build` bundles to `client/dist`; `bun run --filter client preview` serves a production bundle with the same proxy.

## Features

| Feature | Where | Notes |
| --- | --- | --- |
| Server state | `grid/DataGrid.tsx` | `useInfiniteQuery`; sorting, filters, search, grouping and expanded groups are part of the query key. `keepPreviousData` avoids flashes. |
| Infinite scroll | `DataGrid.tsx` | Cursor pages of 200; the next page loads when the last 20 rows come into view. |
| Row virtualization | `DataGrid.tsx` | `@tanstack/react-virtual`, fixed 36px rows, rows are `memo`ised so vertical scrolling only renders new rows. |
| Column virtualization | `DataGrid.tsx` | Horizontal virtualizer over the unpinned columns; pinned columns are sticky. 66 columns, ~14–20 rendered. |
| Sorting | header click, shift-click for multi-sort | Sent as Zalando `sort: ["-order_value", "+customer_name"]`. |
| Filtering | filter icon in each header → MUI `Popover` over the header cell | Text (contains), number/date range, boolean, multi-select for enum/status/icon columns. The TanStack filter value *is* the API filter shape. |
| Per-column search | filter row under the header | One field per column, synced with the popover. Text: contains. Number/date: `42`, `>10`, `<10`, `10..20`, `2025`, `2025-03`, all bounds inclusive; invalid input is marked and not sent. Enum/status/icon/boolean: native `<select>`. Disable with `filterRow={false}`. |
| Fuzzy search | toolbar | Server side, `@tanstack/match-sorter-utils`; every term must match some field, results are ranked. |
| Grouping | toolbar (multi-level) | Server side. The API returns a flattened list of group headers and records of expanded groups, so grouping works with infinite scroll and virtualization. |
| Row + group checkboxes | `grid/selection.ts` | Selection is stored as scope decisions (`all`, group path, record), so selecting a collapsed group with 3,000 unloaded records is exact and can be sent to a bulk endpoint. Group checkboxes show indeterminate state, and the count is exact. |
| Edit mode | toolbar switch | Editable cells are styled like inputs; a real `<input>`/`<select>` only mounts for the cell being edited, on the first keystroke (seeded with it), Enter/F2 or double-click. Enter commits, Esc cancels. Booleans toggle on click/Space. Optimistic update + rollback via `PATCH` (merge patch). |
| Keyboard | | Arrow keys move between cells (scrolling virtualized rows and columns), ←/→ collapse/expand on group rows, Space toggles selection. |
| Icons | `grid/icons.tsx` | One SVG sprite (`<symbol>`s) mounted once; cells only render `<svg><use href="#…"/></svg>`. |
| Status indicators | `renderValue` in `grid/cells.tsx` | `<span class="tg-status" data-tone="success">`, coloured from the theme. |
| Boolean / date / number formatting | `grid/cells.tsx` | Cached `Intl` formatters; per-column `meta.format`. |

### Styling: the parent holds the `sx`

All grid styles are in `client/src/App.styles.ts` (`gridSx`), owned by the parent and passed as `<DataGrid sx={gridSx} />`. They are applied once on the grid root and target class names (`.tg-row`, `.tg-cell`, …). Cells are plain elements with no `sx`/styled components, so there is no per-cell Emotion work. The styled root is outside the component that re-renders on scroll, so the `sx` is not re-serialised on every frame.

MUI is used where it adds value (toolbar inputs, Autocomplete, Switch, Popover and its form controls, Snackbar, progress bar) and not inside the hot cell-render path (cells use native checkboxes and inputs).

### Performance notes

Measured with Chrome CPU profiles on a production build (300 vertical + 150 horizontal scroll frames, 40 keystrokes):

- No MUI component renders while scrolling. The progress bar is a native element (an idle MUI `LinearProgress` kept animating while hidden), and the filter `Popover` is only mounted while open.
- `DataGrid` is memoised and `SearchField` owns its draft state, so keystrokes don't re-render the toolbar, the grid, or the root `sx`. Typing cost went 33 ms → 7 ms.
- Formatted cell strings are cached per column, because `Intl.format()` was the largest single cost when re-rendering cells on horizontal scroll.
- Every record and group row has a checkbox in both modes. Space selects a row, except on editable cells in edit mode, where it starts editing.

## API (Zalando RESTful guidelines)

See `server/openapi.yaml`.

- `POST /orders/query`: query with a body (`filters`, `search`, `sort`, `group_by`, `expanded_groups`, `limit`, `cursor`)
- `PATCH /orders/{order_id}`: `application/merge-patch+json`
- `GET /health`

Guideline points applied: snake_case properties, UPPER_SNAKE_CASE enums, no `/api` or version in paths, cursor-based pagination with opaque cursors (bound to the query they were issued for), `application/problem+json` errors, `X-Flow-ID` propagation, RFC 3339 dates.

## TanStack Table v9 notes

- Features are registered explicitly (`grid/features.ts`). No client row models are registered because the server owns processing (`manual*` flags).
- Column/table meta types are scoped via `metaHelper` slots, with no global module augmentation.
- `useTable` returns a new wrapper object every render, so don't pass `table` into memoised rows.
- `<table.FlexRender cell>` renders `null` for cells of grouped columns (placeholders), and `groupedColumnMode` defaults to `'reorder'`. With server grouping, the grid uses `flexRender()` directly and `groupedColumnMode: false`.
- v9 resolves an `'auto'` filterFn even with `manualFiltering`, so the default column gets a no-op `filterFn`.
