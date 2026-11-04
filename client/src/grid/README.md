# grid

The data grid, kept as a library inside the app so it can move to its own package later.

## Rules

- **Public API is `index.ts`.** Code outside `grid/` imports only from `./grid`. Anything not exported there is internal.
- **No imports from outside `grid/`** in library code. The app depends on the grid, never the reverse. Stories are the exception: they may use the demo fixtures in `src/stories/` and the demo columns.
- **One component per file, with a story next to it** (`Name.tsx` + `Name.stories.tsx`).
- **Model and view are separate.** `model/` holds the headless logic (state, query, table) and contains no JSX and no DOM access. View components read the model from context and own only view state (virtualizers, an open popover).
- **The render path stays as it is.** `HeaderCell`, `DataRow`, `BodyCell`, `GroupRow` and `FilterCell` are memoised, and get derived state as props, never the `table` object. Moving code between files must keep these memo boundaries (see `docs/library-review.md`).

## Layout

| Folder | Contents |
| --- | --- |
| `DataGrid.tsx` | `<DataGrid>`: Root with the default parts, plus the `DataGrid.Root` / `.Viewport` / `.StatusBar` namespace. |
| `GridRoot.tsx` | Styled shell (renders only on prop changes) and the provider that runs `useGridModel`. |
| `GridViewport.tsx` | Scroller, header and filter rows, virtualized body, keyboard and column drag. The only part that renders on scroll. |
| `context.ts` | The three contexts (model, status, rendered-column store) and `useGridStatus`. |
| `model/` | Headless: `useGridState` (controllable state, resets), `useGridQuery` (request, data source, paging, totals, edits), `toQueryRequest`, and `useGridModel`, which wires them to the TanStack table. |
| `core/` | No UI: query protocol types, TanStack features and meta types, selection, pinning, `useControllable`. |
| `data/` | The `useData` contract and the TanStack Query and RTK Query adapters. |
| `header/` | `HeaderCell` and `useColumnReorder` (drag and drop on the header row). |
| `body/` | `DataRow`, `BodyCell`, `GroupRow`, and `useGridKeyboard` (keyboard navigation and editing, delegated to the scroller). |
| `cells/` | Cell content: `GridCell` with its editors, value formatting, `Checkbox`, the selection column. |
| `filters/` | `FilterCell` (the filter row) and `FilterPopover`. |
| `footer/` | `StatusBar` (props only) and `GridStatusBar` (`DataGrid.StatusBar`, fed by context). |
| `controls/` | Components that sit around the grid and drive its props: `GroupByField`, `EditModeToggle`. |
| `icons/` | SVG sprite and `Icon`. |
| `styles/` | `gridSx` (applied by `DataGrid`) and the checkbox styles (registered in the app theme, because the filter popover renders outside the grid root). |

## Composition

`<DataGrid>` is the default: Root, Viewport and StatusBar. It is memoised on flat props, so a parent re-render with unchanged props costs nothing. Compose the parts yourself only when the layout has to change:

```tsx
<DataGrid.Root columns={columns} useData={useOrders} getRecordId={getId}>
  <MySummary />                {/* any component; useGridStatus() for counts */}
  <DataGrid.Viewport filterRow={false} />
  <DataGrid.StatusBar><Actions /></DataGrid.StatusBar>
</DataGrid.Root>
```

Keep the children stable (static JSX, or memoise them as the app does for its status bar actions). New children re-render the whole grid.

Each part re-renders only for what it reads:

| Change | Re-renders |
| --- | --- |
| Scroll (vertical or horizontal) | Viewport only. The model, `useTable` and `useData` are not touched. |
| Data, sorting, filters, selection, editing | Root provider and Viewport. StatusBar and `useGridStatus()` consumers only if a count changed. |
| Number of rendered columns | StatusBar, through an external store and not through context. |
| Root props | The shell `Box` and everything below it. |

Only the hot path stays below the context level. Rows, cells and headers get props and stay memoised. They never read context, because a context value that changes on every frame would re-render all of them.
