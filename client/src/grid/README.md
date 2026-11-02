# grid

The data grid, kept as a library inside the app so it can move to its own package later.

## Rules

- **Public API is `index.ts`.** Code outside `grid/` imports only from `./grid`. Anything not exported there is internal.
- **No imports from outside `grid/`** in library code. The app depends on the grid, never the reverse. Stories are the exception: they may use the demo fixtures in `src/stories/` and the demo columns.
- **One component per file, with a story next to it** (`Name.tsx` + `Name.stories.tsx`).
- **The render path stays as it is.** `HeaderCell`, `DataRow`, `BodyCell`, `GroupRow` and `FilterCell` are memoised, and get derived state as props, never the `table` object. Moving code between files must keep these memo boundaries (see `docs/library-review.md`).

## Layout

| Folder | Contents |
| --- | --- |
| `DataGrid.tsx` | The grid: state, table, virtualization, and the layout of header, body and footer. |
| `core/` | No UI: query protocol types, TanStack features and meta types, selection, pinning, `useControllable`. |
| `data/` | The `useData` contract and the TanStack Query and RTK Query adapters. |
| `header/` | `HeaderCell` and `useColumnReorder` (drag and drop on the header row). |
| `body/` | `DataRow`, `BodyCell`, `GroupRow`, and `useGridKeyboard` (keyboard navigation and editing, delegated to the scroller). |
| `cells/` | Cell content: `GridCell` with its editors, value formatting, `Checkbox`, the selection column. |
| `filters/` | `FilterCell` (the filter row) and `FilterPopover`. |
| `footer/` | `StatusBar`. |
| `controls/` | Components that sit around the grid and drive its props: `GroupByField`, `EditModeToggle`. |
| `icons/` | SVG sprite and `Icon`. |
| `styles/` | `gridSx` (applied by `DataGrid`) and the checkbox styles (registered in the app theme, because the filter popover renders outside the grid root). |
