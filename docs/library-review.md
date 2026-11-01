# Data grid library review

Review of `client/src/grid/` as the base of a reusable data grid library (state at `6ff6f13`, 2026-11-01).

**Rule for every item below:** no change may cost rendering performance. Each finding has a **Perf** tag:

- **neutral**: no change to the render path (types, packaging, docs, tests, code outside the hot path).
- **positive**: fewer renders or less work per frame.
- **guarded**: touches the hot path. Only merge it if a before/after profile (see [§8](#8-performance-guardrails)) shows no regression.

Severity: **High** = blocks shipping as a library or is a bug, **Medium** = public API / quality issue, **Low** = polish.

---

## 1. Summary

The rendering core is in good shape. Row and column virtualization, memoised rows/cells/headers, delegated event handlers, one root `sx`, an SVG sprite, cached `Intl` formatters and scope-based selection are the right choices, and the README records how each one was measured. Keep all of that.

The code is not yet a library. It is an app folder:

1. The grid imports the Orders API types (`../api/orders`), so the server's wire format (Zalando filter shapes, `snake_case`, `GROUP`/`RECORD` items) is part of the grid.
2. A consumer has to rebuild the styling (`gridSx` lives in `App.styles.ts`, the checkbox CSS in the app theme) and mount `<IconSprite />` themselves.
3. There is no package boundary, public entry point, build or `peerDependencies`.
4. There are no tests or lint rules, and no automated check that would catch a performance regression.
5. State control is uneven: sorting, filters and column order can be controlled, but expanded groups, selection, column sizing, visibility and pinning cannot.

Two small render-path bugs are worth fixing first ([F-1](#f-1-header-cells-lose-memoisation-when-filterrowfalse), [F-2](#f-2-every-header-cell-re-renders-on-selection-change)). Both make the grid faster.

---

## 2. Keep as is

| Decision | Where | Why it matters |
| --- | --- | --- |
| Styled shell `memo`ised, all work in `GridBody` | `DataGrid.tsx:85` | The large root `sx` is not re-serialised on scroll. |
| `HeaderCell` / `DataRow` / `BodyCell` / `GroupRow` memoised, derived state passed as props, never `table` | `DataGrid.tsx:680-860` | `useTable()` returns a new object every render. |
| Delegated `onKeyDown` / `onClick` / drag handlers on the scroller and header row | `DataGrid.tsx:408-508` | No per-cell closures. |
| Editor only mounted for the edited cell | `cells.tsx:117` | Cells stay plain markup. |
| Formatted strings cached per column meta (bounded), `Intl` formatters cached | `cells.tsx:11-41` | Biggest single cost when re-rendering cells. |
| Native checkbox / select / input in cells, MUI only outside the hot path | `cells.tsx`, `FilterRow.tsx` | No MUI renders while scrolling. |
| Popover mounted only while open | `DataGrid.tsx:643` | A closed MUI `Popover` still rendered on every frame. |
| Scope-based selection (`all`, group, record) | `selection.ts` | Exact for unloaded rows. This is also the bulk-API payload. |
| Overscan 4 | `DataGrid.tsx:328` | Measured, see README. |

Any refactor below must keep these properties.

---

## 3. Render-path bugs (fix first)

### F-1 Header cells lose memoisation when `filterRow={false}`
**Fixed** · was High · Perf positive · `DataGrid.tsx:531`

```tsx
onFilter={filterRow ? undefined : (anchor) => setFilterTarget({ column: header.column, anchor })}
```

The arrow function is new on every `GridBody` render, and `GridBody` re-renders on every scroll frame (the virtualizer updates). With the filter row hidden, every visible `HeaderCell` therefore re-renders on every frame. The default mode is not affected, which is why the profiles did not show it.

**Fix:** pass the stable `openFilter` (already defined at `:535`) together with a `filterButton: boolean`, and call `openFilter(column, anchor)` inside `HeaderCell`.

### F-2 Every header cell re-renders on selection change
**Fixed** · was Medium · Perf positive · `DataGrid.tsx:527`

`selection` goes to every `HeaderCell` but is only needed by the select-all checkbox. Each click on a row checkbox re-renders all ~15–20 header cells.

**Fix:** `selection={header.column.id === 'select' ? selection : undefined}`. The same applies to `selected` in `BodyCell` (`:798`): only the `select` cell reads it. Passing it only to that cell saves ~14 cell renders per toggle.

### F-3 Side effects during render and inside a state updater
**Medium · Perf neutral** · `DataGrid.tsx:269-274`, `:376`

- `focusRef.current = …` is written during render. React's rules (and the React Compiler) treat that as unsafe. Under concurrent rendering a discarded render can leave a closure over stale `rows`.
- `stopEdit` calls `focusRef.current(...)` inside the `setEditing` updater. Updaters must be pure: StrictMode runs them twice, so focus and scroll run twice in development.

**Fix:** assign `focusRef.current` in `useLayoutEffect` (or use `useEffectEvent`, which is stable in React 19.2). Keep `editing` in a ref next to the state, so `stopEdit` reads the current cell, calls `setEditing(null)`, then focuses. There is no extra render: same number of `setState` calls.

### F-4 `GroupRow` comparator ignores `column`
**Low · Perf neutral** · `DataGrid.tsx:858`

The custom `memo` comparator skips `column` and `item`. `item` changes together with `row`, so that is fine. A changed column definition (e.g. a new header label or options while grouped) leaves group rows stale until they scroll out of view. Add `a.column === b.column`. It is a reference check and stays cheap.

---

## 4. Library boundary and packaging

### L-1 Grid depends on the app's API module
**High · Perf neutral** · `DataGrid.tsx:7`, `cells.tsx:3`, `features.ts:14`, `FilterPopover.tsx:11`, `FilterRow.tsx:3`

`Filter`, `FilterValue`, `QueryItem`, `QueryRequest` and `QueryResponse` come from `client/src/api/orders.ts`. A second backend cannot use the grid without matching that wire format exactly.

**Fix:** the grid owns a small data-source contract, and each app writes an adapter:

```ts
// grid/types.ts (library)
export type GridFilter = /* current FilterValue union, grid-owned */
export interface GridQuery { filters: Array<{ field: string } & GridFilter>; sort: Array<{ id: string; desc: boolean }>; groupBy: string[]; expanded: string[]; limit: number; cursor?: string }
export interface GridPage<T> { items: Array<GridItem<T>>; next?: string; totalItems: number; totalRecords: number }
export interface GridDataSource<T> {
  fetchPage(query: GridQuery, signal: AbortSignal): Promise<GridPage<T>>
  updateRecord?(id: string, patch: Partial<T>): Promise<T>
}
```

The Zalando mapping (`"-field"` sort strings, `snake_case`) moves into `api/orders.ts`. It runs once per request, not per frame.

### L-2 No package, entry point or build
**High · Perf neutral**

- Move the grid to `packages/data-grid/` (Bun workspace already set up) with `src/index.ts` as the only public entry point. Export `DataGrid`, column helpers, types, `IconSprite`/icon registry and the style factory. Keep everything else internal.
- `peerDependencies`: `react`, `react-dom`, `@mui/material`, `@emotion/react`, `@emotion/styled`, `@tanstack/react-query`. Bundle `@tanstack/react-table` and `@tanstack/react-virtual` or make them peers too. Peers avoid two copies of React Query (two caches, broken `useQueryClient`).
- Build ESM and `.d.ts` (`bun build` + `tsc --emitDeclarationOnly`, or `tsdown`). Set `"sideEffects": false` and `"exports"`. Keep MUI deep imports (`@mui/material/Box`) as they are, for tree shaking.
- The app and Storybook import the package by name, which proves the public API is enough.

### L-3 Styles live in the consumer
**High · Perf neutral (if done as below)** · `App.styles.ts`, `theme.ts:16`, `checkbox.styles.ts`

A consumer must copy ~450 lines of `gridSx` and register `.tg-checkbox` in `CssBaseline`, or the grid renders unstyled.

**Fix:** ship the styles with the library and keep the "one stable `sx` on the root" rule:

- Export `gridStyles: SxProps<Theme>` (module scope, same object every render) and use it as the root's default. Apply a consumer `sx` with the array form `sx={[gridStyles, ...(Array.isArray(sx) ? sx : [sx])]}` only when one is passed.
- Move the checkbox rules under `.tg-root`, plus the popover paper (the multi-select popover is outside the root), instead of a global `CssBaseline` override.
- Document the `tg-*` class names and the `--row-*` CSS variables as the public styling API (versioned, renamed only in a major release).

Keep the styles a stable module-level object. A new object per render would put Emotion serialisation back into the hot path.

### L-4 Icon set is closed and app-specific
**Medium · Perf neutral** · `icons.tsx`

`IconName` is a fixed union that mixes grid icons (`chevron-*`, `filter`, `arrow-*`) with app icons (`store`, `wallet`, `zoom-in`, `light-mode`). `OptionDef.icon` can only use these names. The consumer must also remember to mount `<IconSprite />`. Symbol ids are global, so two sprites (two apps or micro-frontends) produce duplicate ids.

**Fix:** the library sprite contains only the grid's own icons and is rendered by `DataGrid` once (a module-level ref count or a check for `document.getElementById`). Consumers register extra icons (`<IconSprite icons={{ store: 'M…' }} />`), and `IconName` becomes `string` with a typed extension point. Cells keep rendering `<svg><use/></svg>`, so render cost is unchanged.

### L-5 Columns are written against the wire item
**Medium · Perf neutral** · `columns.ts:53-66`

Every column needs `accessorFn: (item) => item.kind === 'RECORD' ? item.record[key] : undefined`. Provide a helper (`recordColumn<T>(key, header, meta)` or `createGridColumnHelper<T>()`) that builds exactly this function once per column definition. That is the same code at runtime, without the boilerplate.

### L-6 Demo concerns inside the component
**Medium · Perf neutral** · `DataGrid.tsx:634-641`

- The status bar shows debug figures (`"66 columns (14 rendered)"`, `"N loaded"`). Make the status bar optional (`statusBar={false}` or a render slot) and move the debug figures to the demo.
- `MAX_RELOAD = 5000` (`:27`) mirrors the server's `MAX_LIMIT`. Make it a prop (`maxPageSize`).
- Row and header heights are constants. Header height is fine as a constant; expose it in CSS only if density modes need it.

### L-7 Hard-coded English and implicit locale
**Medium · Perf neutral** · `DataGrid.tsx:586, 631, 635-639`, `cells.tsx:60, 80`, `FilterRow.tsx`, `FilterPopover.tsx`

"Loading more…", "No results", "records", "Select all", "Yes"/"No", "Filter …", placeholders. `toLocaleString()` and `Intl.*(undefined, …)` use the browser locale, not the app's.

**Fix:** `localeText` prop (partial, merged with English defaults in a `useMemo`) and a `locale` prop passed to the `Intl` formatters. The formatter cache must then be keyed by `meta` **and** locale (`WeakMap<meta, Map<locale, …>>`). That is one more `Map` lookup on a cache miss only, and the per-cell hit stays one `WeakMap` + one `Map` lookup.

---

## 5. Public API consistency

### A-1 Controlled / uncontrolled state is uneven
**Medium · Perf neutral**

| State | Controllable today | Proposal |
| --- | --- | --- |
| sorting, columnFilters, columnOrder | yes (`useControllable`) | keep |
| grouping | controlled only (no `onGroupingChange`) | add `onGroupingChange` for a built-in grouping UI later |
| expanded | internal | `expanded` / `onExpandedChange` |
| selection | output only (`onSelectionChange`) | `selection` / `onSelectionChange` (needed to clear it after a bulk action) |
| columnSizing | internal, lost on reload | `columnSizing` / `onColumnSizingChange` (saved views) |
| columnVisibility | feature registered, no props | `columnVisibility` / `onColumnVisibilityChange` |
| columnPinning | `pinnedColumns` prop only | keep the prop; optionally `onPinnedColumnsChange` |

Use `useControllable` for all of them, so they behave the same way. Each one also needs `initial*` (or one `initialState`) for the uncontrolled case.

`useControllable` itself (`DataGrid.tsx:138`): `value ?? local` treats `null` as uncontrolled, and the setter is a new function each render. That is harmless today because TanStack only calls it. Note this in the docs, or wrap the setter in `useCallback` with a ref to `current` if a setter is ever passed to a memoised child.

### A-2 Errors
**Low · Perf neutral** · `DataGrid.tsx:243, 632`

`onError` only fires for failed edits. A failed page fetch is shown inside the grid but never reported. Fire `onError` for both, with a discriminator (`{ type: 'fetch' | 'update', error }`).

### A-3 Row id encoding leaks
**Low · Perf neutral** · `DataGrid.tsx:126, 277, 288, 436`

Records use `#<id>` and groups their path. `row.id.slice(1)` is repeated in four places. Use `const recordId = (row) => row.id.slice(1)` and `const isRecordRowId`.

### A-4 Naming
**Low · Perf neutral** · `App.tsx:159, 190`

`useGroupingArray` is not a hook (no hooks inside) but is named like one and called inline in JSX. With lint enabled (T-2) the rules-of-hooks check will flag it. Rename it to `groupingArray`.

---

## 6. Accessibility

### X-1 Too many tab stops, scroller not a grid entry point
**Medium · Perf positive/neutral**

Cells have `tabIndex={-1}` (`DataGrid.tsx:770`), but every header sort `<button>`, filter input and row checkbox is tabbable. Tab walks through ~60+ controls, and focusing the scroller itself does nothing (arrow keys need a cell, see `locate`). The [APG grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) uses one tab stop.

**Fix (no per-cell props):** give the scroller `tabIndex={0}` and an `onFocus` that forwards focus to the last focused cell (kept in a ref) or the first cell, via the existing `focusRef`. Set `tabIndex={-1}` on row checkboxes, which are already reachable with Space. Header controls can stay tabbable, as MUI X does. This does not touch memoised cells.

### X-2 Missing ARIA for virtualized rows
**Medium · Perf guarded** · `DataGrid.tsx:552, 802, 836`

`aria-rowcount` is set, but rows have no `aria-rowindex`, so screen readers announce wrong positions in a virtualized list. Cells have no `aria-colindex`, `aria-multiselectable` is missing, and the empty/error message has no `role="status"`.

`aria-rowindex={index + 2}` (header + filter row) on `DataRow`/`GroupRow` uses props they already get. `aria-colindex={ci + 1}` on `BodyCell` too. Attribute-only, no new props, but it adds DOM attributes per cell, so profile it.

### X-3 Group expander button has `tabIndex=-1` and no keyboard path besides arrows/Enter
**Low · Perf neutral**: fine as long as row-level keys stay. Document it.

---

## 7. Correctness and robustness (outside the render path)

| ID | Sev | Where | Finding | Fix |
| --- | --- | --- | --- | --- |
| C-1 | Medium | `FilterRow.tsx:201`, `cells.tsx:146` | `Number(s.replace(',', '.'))` reads `1,000` as `1`. | Parse with the grid locale's separators, or accept only one decimal separator and reject a grouping separator. |
| C-2 | Low | `FilterRow.tsx:218` | `2025-02-31` passes (day ≤ 31) and goes to the server. | Validate with `Date.UTC` round-trip, as `localToIso` already does. |
| C-3 | Low | `DataGrid.tsx:200, 295` | After expand/collapse the reload size is capped at 5000 items. Collapsing a group while scrolled past item 5000 jumps the scroll position. | Document it, or reload from a cursor near the current position. Ties in with L-6 (`maxPageSize`). |
| C-4 | Low | `FilterPopover.tsx:157-162`, `FilterRow.tsx:114` | Debounce effects omit deps (`onSettle`, `onChange`, `parsed`). Correct today because the callbacks only close over stable `column`, but fragile. | Keep the latest callback in a ref (`useEffectEvent`) and keep `[value]` as the only dependency. |
| C-5 | Low | `cells.tsx:160` | Tab in an editor commits but keeps focus on the same cell (spreadsheet users expect it to move to the next cell). | `Tab` → commit + `focusRef(r, ci ± 1)`. |
| C-6 | Low | `cells.tsx:235` | `Checkbox` inline ref callback is replaced on every render (React detaches and re-attaches it). | `useLayoutEffect(() => { ref.current.indeterminate = … }, [indeterminate])`. Cheaper or equal, but it runs in every row: profile it. |
| C-7 | Low | `server/src/query.ts:110-112` | Mock server lowercases the needle per row and uses `Array.includes` for `IN`. | Pre-compute once per query (`Set`, lowercased needle). Server only, a demo but used by Storybook. |
| C-8 | Low | edits | Editing a sorted/filtered/grouped field keeps the row where it is until the next refetch. | Intended (no jumping rows). Document it. |

---

## 8. Performance guardrails

"No change may influence performance" needs a check that runs every time, not a one-off profile.

1. **Render-count tests (cheap, deterministic).** Storybook `play` functions (or `bun test` + `@testing-library/react` with happy-dom) wrap the grid in `<Profiler>` and assert budgets, e.g.:
   - horizontal scroll by one column → `BodyCell` renders ≤ rows × 2;
   - vertical scroll by one row → `DataRow` renders ≤ 2;
   - toggle one row checkbox → `HeaderCell` renders ≤ 1, `BodyCell` renders ≤ 1 (after F-2);
   - `filterRow={false}` scroll → `HeaderCell` renders = 0 (catches F-1).
   Count with a module-level counter that only exists in test builds (`if (process.env.NODE_ENV === 'test')`), so production code is unchanged.
2. **Frame-time benchmark (slower, before a release).** One Playwright script against `bun run build` + `preview`: CPU throttling 4×, the same 300 vertical / 150 horizontal scroll frames and 40 keystrokes as the README, report the share of frames over 16.7 ms. Run it in **Edge** (`channel: 'msedge'`), which is the target browser. Edge is not installed locally, so run it in CI on a Windows runner.
3. **Bundle size budget** for the package build (e.g. `size-limit`), so a stray MUI import in a cell is noticed.
4. Write the budgets into the README's performance section, and make PRs that touch `DataGrid.tsx`/`cells.tsx` include the benchmark output.

### Performance-positive ideas (optional, guarded)

- **Column widths as CSS variables.** TanStack's recommended pattern: set `--col-<id>-size` once on the canvas and use `width: var(--col-x-size)` in cells. Resizing then re-renders no rows, only the canvas style. It currently re-renders every visible cell of the resized column and every pinned cell after it.
- **`content-visibility` / `contain: strict` on `.tg-row`.** Rows are absolutely positioned with a fixed height, which makes them good candidates. Profile in Edge.

---

## 9. Tooling and code quality

### T-1 No tests
**High · Perf neutral**

The parts that are pure functions are easy to test and the riskiest to change: `selection.ts` (inheritance, `countSelected` with nested groups), `FilterRow.tsx` `parse`/`toText` round-trip, `filterDates.ts` (DST edges), `queryParams.ts` (`serializeColumnOrder`), `QueryEngine` (cursor binding, grouping). Use `bun test`, which needs no new runner. Export `parse`/`toText` from a separate `filterExpressions.ts` so they can be tested without React.

### T-2 No lint, mixed formatting
**Medium · Perf neutral**

- Add ESLint with `eslint-plugin-react-hooks` (catches C-4, A-4, F-3) and `@typescript-eslint`. Optionally the React Compiler lint rules, without enabling the compiler: the hand-tuned memo comparators must stay.
- The files mix two styles (`App.tsx`, `FilterPopover.tsx`: double quotes + semicolons; `DataGrid.tsx`, `cells.tsx`: single quotes, none). Add Prettier (or Biome) with one config and reformat in a separate commit, so `git blame` stays usable.

### T-3 Split `DataGrid.tsx` (860 lines)
**Low · Perf neutral if done as moves only**

Suggested modules: `useGridQuery` (query + mutation + cache patch), `useGridKeyboard` (locate / keys / click), `useColumnReorder` (drag & drop), `HeaderCell.tsx`, `rows.tsx` (`DataRow`, `BodyCell`, `GroupRow`). Moving code between files changes nothing at runtime. Keep the hooks' return values memoised exactly as the inline code is now (e.g. `openFilter`), or memo boundaries break.

### T-4 Documentation
**Medium · Perf neutral**

- README → library README (install, minimal example, data-source contract, column meta reference, styling API, keyboard map). Move the demo/server parts to `apps/demo/README.md`.
- Add TSDoc on every exported prop (most already have it).
- Storybook: add a "Docs" page per feature and an a11y addon run (`@storybook/addon-a11y`).
- `CHANGELOG.md` + semver from the first published version. Treat the `tg-*` classes as public API (L-3).

### T-5 Browser support statement
**Low · Perf neutral**

The CSS uses `color-mix()`, `:where()`, `:is()` and logical properties (Edge ≥ 111). Write the supported browser list into the package README and `browserslist`.

---

## 10. Suggested order

| Step | Items | Perf |
| --- | --- | --- |
| 1. Guardrails first | T-1, T-2, §8.1 render-count tests | neutral |
| 2. Quick wins | F-1, F-2, F-3, F-4, A-3, A-4 | positive / neutral |
| 3. Library boundary | L-1, L-2, L-3, L-4, L-5 | neutral |
| 4. API | A-1, A-2, L-6, L-7 | neutral |
| 5. Accessibility | X-1, X-2 | neutral / guarded |
| 6. Polish | C-1…C-8, T-3, T-4, T-5, §8 optional ideas | mixed, profile guarded items |

Steps 1–2 are small and independent. Step 3 is the largest and should land as moves plus a thin adapter, with the render-count tests from step 1 showing that nothing in the hot path changed.
