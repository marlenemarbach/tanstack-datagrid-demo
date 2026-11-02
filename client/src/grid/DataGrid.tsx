import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'
import { useTable, type ColumnFiltersState, type ColumnOrderState, type ExpandedState, type SortingState } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { DataRow } from './body/DataRow'
import { GroupRow } from './body/GroupRow'
import { useGridKeyboard, type FocusCell } from './body/useGridKeyboard'
import { GridCell } from './cells/GridCell'
import { selectColumn } from './cells/selectColumn'
import { features, type ColumnType, type EditingCell, type GridColumn, type GridColumnDef, type GridHeader, type GridTableMeta } from './core/features'
import { pinOffset } from './core/pinning'
import { countSelected, emptySelection, groupCheckState, isRecordSelected, setAll, setScope, type SelectionState } from './core/selection'
import type { Filter, FilterValue, QueryRequest } from './core/types'
import { useControllable } from './core/useControllable'
import type { UseGridData } from './data/dataSource'
import { FilterCell } from './filters/FilterCell'
import { FilterPopover, type FilterTarget } from './filters/FilterPopover'
import { StatusBar } from './footer/StatusBar'
import { HeaderCell } from './header/HeaderCell'
import { useColumnReorder } from './header/useColumnReorder'
import { gridSx } from './styles/gridSx'

const DEFAULT_ROW_HEIGHT = 36
const HEADER_ROW_HEIGHT = 40
const FILTER_ROW_HEIGHT = 36
const MAX_RELOAD = 5000

export interface SelectionInfo {
  state: SelectionState
  count: number
}

export interface DataGridProps<T> {
  columns: Array<GridColumnDef<T>>
  /**
   * Loads pages and saves edits, e.g. `tanstackDataSource(…)` or `rtkDataSource(…)`.
   * Must keep the same identity across renders.
   */
  useData: UseGridData<T>
  getRecordId: (record: T) => string
  grouping?: Array<string>
  /** Controlled sorting; omit to let the grid own it. */
  sorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
  /** Controlled column filters; omit to let the grid own them. */
  columnFilters?: ColumnFiltersState
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void
  /** Controlled column order (drag headers to reorder); omit to let the grid own it. */
  columnOrder?: ColumnOrderState
  onColumnOrderChange?: (order: ColumnOrderState) => void
  editMode?: boolean
  /** Body row height in px (default 36). */
  rowHeight?: number
  /** Column ids pinned to the start, after the selection column. */
  pinnedColumns?: Array<string>
  pageSize?: number
  /** One search field per column below the header (default true). */
  filterRow?: boolean
  /** Vertical borders between header, filter and body cells (default true). */
  columnBorders?: boolean
  /** Light grey background on every second row (default false). */
  stripedRows?: boolean
  /** Added on top of the built-in styles (`gridSx`), which target class names, not individual cells. */
  sx?: SxProps<Theme>
  onSelectionChange?: (selection: SelectionInfo) => void
  /** Extra controls at the right end of the status bar. */
  statusBarActions?: ReactNode
  onError?: (error: Error) => void
}

const EMPTY: Array<never> = []
const serverSideFilter = () => true

/**
 * The styled shell renders only when props change. Scrolling and other
 * internal updates stay inside <GridBody>, so the (large) root `sx` is not
 * re-serialised on every frame.
 */
export const DataGrid = memo(function DataGrid<T>(props: DataGridProps<T>) {
  return (
    <Box
      className="tg-root"
      // The built-in styles are one module-level object; a consumer `sx` is layered on top.
      sx={props.sx ? [gridSx, ...(Array.isArray(props.sx) ? props.sx : [props.sx])] : gridSx}
      data-edit-mode={props.editMode ? 'true' : undefined}
      data-column-borders={props.columnBorders !== false ? 'true' : undefined}
      data-striped-rows={props.stripedRows ? 'true' : undefined}
      style={{ '--row-height': `${props.rowHeight ?? DEFAULT_ROW_HEIGHT}px` } as CSSProperties}
    >
      <GridBody {...(props as unknown as DataGridProps<unknown>)} />
    </Box>
  )
}) as <T>(props: DataGridProps<T>) => ReactElement

/**
 * Column types whose filter is a select (native or popover button). Their
 * minimum width keeps "All" + chevron inside the filter cell's padding:
 * 16 cell padding + 2 border + 8 input padding + ~20 text + 4 gap + 18 chevron (~68), with room for short labels.
 */
const SELECT_FILTER_TYPES = new Set<ColumnType | undefined>(['boolean', 'enum', 'status', 'icon'])
const SELECT_FILTER_MIN_SIZE = 100

function GridBody(props: DataGridProps<unknown>) {
  const { useData, getRecordId, onError, onSelectionChange } = props
  const grouping = props.grouping ?? EMPTY
  const editMode = !!props.editMode
  const pageSize = props.pageSize ?? 200
  const filterRow = props.filterRow ?? true
  const rowHeight = props.rowHeight ?? DEFAULT_ROW_HEIGHT
  const headerHeight = HEADER_ROW_HEIGHT + (filterRow ? FILTER_ROW_HEIGHT : 0)

  const [sorting, setSorting] = useControllable(props.sorting, props.onSortingChange, EMPTY)
  const [columnFilters, setColumnFilters] = useControllable(props.columnFilters, props.onColumnFiltersChange, EMPTY)
  const [columnOrder, setColumnOrder] = useControllable(props.columnOrder, props.onColumnOrderChange, EMPTY)
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [selection, setSelection] = useState<SelectionState>(emptySelection)
  const [editing, setEditing] = useState<(EditingCell & { r: number; ci: number }) | null>(null)
  const [filterTarget, setFilterTarget] = useState<FilterTarget | null>(null)
  /** How many items to request again after an expand/collapse, so the scroll position survives. */
  const reloadSize = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset dependent state whenever the result set changes (render-time reset, no extra effect pass).
  const shape = JSON.stringify([columnFilters, grouping])
  const [prevShape, setPrevShape] = useState(shape)
  if (shape !== prevShape) {
    setPrevShape(shape)
    setSelection(emptySelection)
    setExpanded({})
    reloadSize.current = 0
  }
  const sortShape = JSON.stringify(sorting)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    reloadSize.current = 0
  }, [shape, sortShape])

  // -- server state ---------------------------------------------------------

  const request = useMemo<QueryRequest>(
    () => ({
      filters: columnFilters.map((f) => ({ field: f.id, ...(f.value as FilterValue) }) as Filter),
      sort: sorting.map((s) => `${s.desc ? '-' : '+'}${s.id}`),
      group_by: grouping,
      expanded_groups: expanded === true ? [] : Object.keys(expanded).filter((k) => expanded[k]),
    }),
    [columnFilters, sorting, grouping, expanded],
  )

  const data = useData({
    request,
    initialLimit: Math.min(MAX_RELOAD, Math.max(pageSize, reloadSize.current)),
    pageSize,
    getRecordId,
  })
  const update = data.update

  const items = useMemo(() => data.pages?.flatMap((p) => p.items) ?? EMPTY, [data.pages])
  const lastPage = data.pages?.at(-1)
  const totalRecords = lastPage?.total_records ?? 0
  const totalItems = lastPage?.total_items ?? 0

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) if (item.kind === 'GROUP') counts.set(item.group_path, item.count)
    return counts
  }, [items])

  // -- table ----------------------------------------------------------------

  const columns = useMemo(
    () => [
      selectColumn,
      ...(props.columns as Array<GridColumnDef<unknown>>).map((c) =>
        c.minSize === undefined && SELECT_FILTER_TYPES.has(c.meta?.type) ? { ...c, minSize: SELECT_FILTER_MIN_SIZE } : c,
      ),
    ],
    [props.columns],
  )
  const columnPinning = useMemo(() => ({ start: ['select', ...(props.pinnedColumns ?? [])], end: [] }), [props.pinnedColumns])

  const focusRef = useRef<FocusCell>(() => {})

  const meta = useMemo<GridTableMeta>(
    () => ({
      editMode,
      editing,
      selection,
      select: (scope, value) => setSelection((s) => (scope ? setScope(s, scope, value) : setAll(value))),
      stopEdit: (refocus) => {
        setEditing((current) => {
          if (current && refocus) focusRef.current(current.r, current.ci)
          return null
        })
      },
      commit: (rowId, columnId, value) => {
        update?.(rowId.slice(1), { [columnId]: value }).catch((e: Error) => onError?.(e))
      },
    }),
    [editMode, editing, selection, update, onError],
  )

  const table = useTable({
    features,
    columns,
    data: items,
    getRowId: (item) => (item.kind === 'GROUP' ? item.group_path : `#${getRecordId(item.record)}`),
    getRowCanExpand: (row) => row.original.kind === 'GROUP',
    state: { sorting, columnFilters, columnOrder, grouping, expanded, columnPinning },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnFiltersChange: setColumnFilters,
    onExpandedChange: (updater) => {
      reloadSize.current = items.length + pageSize
      setExpanded(updater)
    },
    // The server owns every processing stage.
    manualSorting: true,
    manualFiltering: true,
    manualGrouping: true,
    manualExpanding: true,
    enableMultiSort: true,
    // Grouping is server-side: keep column order and never hide grouped cells.
    groupedColumnMode: false,
    columnResizeMode: 'onChange',
    // filterFn: the server filters; this only stops v9 resolving an 'auto' client filterFn.
    defaultColumn: { cell: GridCell, size: 150, minSize: 60, filterFn: serverSideFilter },
    meta,
  })

  const rows = table.getRowModel().rows
  const startColumns = table.getStartVisibleLeafColumns()
  const centerColumns = table.getCenterVisibleLeafColumns()
  const navColumns = useMemo(() => [...startColumns, ...centerColumns], [startColumns, centerColumns])
  const columnSizing = table.state.columnSizing
  const totalWidth = table.getTotalSize()
  const startWidth = table.getStartTotalSize()
  const centerWidth = table.getCenterTotalSize()

  // -- virtualization ---------------------------------------------------------

  const hasMore = data.hasNextPage
  const rowVirtualizer = useVirtualizer({
    count: rows.length + (hasMore ? 1 : 0),
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 4,
    scrollMargin: headerHeight,
    getItemKey: (i) => rows[i]?.id ?? '__loader',
  })

  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: centerColumns.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => centerColumns[i]!.getSize(),
    overscan: 3,
    scrollMargin: startWidth,
    getItemKey: (i) => centerColumns[i]!.id,
  })

  // Cached row sizes are stale after a zoom change.
  useLayoutEffect(() => {
    rowVirtualizer.measure()
  }, [rowVirtualizer, rowHeight])

  useLayoutEffect(() => {
    columnVirtualizer.measure()
  }, [columnVirtualizer, columnSizing, centerColumns])

  const virtualRows = rowVirtualizer.getVirtualItems()
  const virtualColumns = columnVirtualizer.getVirtualItems()
  const colStart = virtualColumns[0]?.index ?? 0
  const colEnd = virtualColumns.at(-1)?.index ?? -1
  const padLeft = centerColumns[colStart]?.getStart('center') ?? 0
  const lastCol = centerColumns[colEnd]
  const padRight = lastCol ? centerWidth - lastCol.getStart('center') - lastCol.getSize() : 0

  // Infinite scroll: fetch the next page when the loader row comes into range.
  const lastVirtualIndex = virtualRows.at(-1)?.index ?? 0
  const { fetchNextPage, isFetchingNextPage, isStale } = data
  useEffect(() => {
    if (hasMore && !isFetchingNextPage && !isStale && lastVirtualIndex >= rows.length - 20) void fetchNextPage()
  }, [hasMore, isFetchingNextPage, isStale, lastVirtualIndex, rows.length, fetchNextPage])

  // -- selection output -------------------------------------------------------

  const selectedCount = useMemo(() => countSelected(selection, totalRecords, groupCounts), [selection, totalRecords, groupCounts])
  useEffect(() => {
    onSelectionChange?.({ state: selection, count: selectedCount })
  }, [selection, selectedCount, onSelectionChange])

  // -- keyboard navigation & editing (delegated, no per-cell handlers) --------

  const { onKeyDown, onClick } = useGridKeyboard({
    rows,
    navColumns,
    startCount: startColumns.length,
    rowVirtualizer,
    columnVirtualizer,
    scrollRef,
    focusRef,
    meta,
    selection,
    canUpdate: editMode && !!update,
    setEditing,
  })

  // -- column reordering (native drag and drop, delegated on the header row) --

  const columnIds = useMemo(() => props.columns.map((c) => c.id!), [props.columns])
  const { dragColumn, dropTarget, handlers: reorderHandlers } = useColumnReorder(columnIds, columnOrder, setColumnOrder)

  // -- render -----------------------------------------------------------------

  // Stable, so memoised header and filter cells keep their memo.
  const openFilter = useCallback((column: GridColumn, anchor: HTMLElement) => setFilterTarget({ column, anchor }), [])

  const startHeaders = table.getStartLeafHeaders()
  const centerHeaders = table.getCenterLeafHeaders()
  const renderHeader = (header: GridHeader, ci: number) => (
    <HeaderCell
      key={header.id}
      header={header}
      ci={ci}
      sorted={header.column.getIsSorted()}
      sortIndex={header.column.getSortIndex()}
      multiSort={table.state.sorting.length > 1}
      size={header.getSize()}
      resizing={header.column.getIsResizing()}
      filtered={header.column.getIsFiltered()}
      isLastPinned={header.column.id === startColumns.at(-1)?.id}
      pinnedOffset={pinOffset(header.column)}
      // Only the select-all checkbox reads it; other headers would re-render on every toggle.
      selection={header.column.id === 'select' ? selection : undefined}
      dragging={dragColumn === header.column.id}
      dropSide={dropTarget?.id === header.column.id ? dropTarget.side : undefined}
      // With the filter row shown, filtering lives there; the header button is the fallback.
      onFilter={filterRow ? undefined : openFilter}
    />
  )

  const renderFilter = (column: GridColumn, isLastPinned: boolean) => (
    <FilterCell
      key={column.id}
      column={column}
      value={column.getFilterValue() as FilterValue | undefined}
      width={column.getSize()}
      pinnedOffset={column.getIsPinned() === 'start' ? column.getStart('start') : undefined}
      isLastPinned={isLastPinned}
      onOpen={openFilter}
    />
  )

  return (
    <>
      <div className="tg-progress" role="progressbar" aria-busy={data.isFetching} data-active={data.isFetching ? 'true' : undefined} />
      <div ref={scrollRef} className="tg-scroller" role="grid" aria-rowcount={totalItems} aria-colcount={navColumns.length} onKeyDown={onKeyDown} onClick={onClick}>
        <div className="tg-canvas" style={{ width: totalWidth }}>
          <div className="tg-header" style={{ width: totalWidth, height: headerHeight }}>
            <div
              className="tg-header-row"
              role="row"
              style={{ height: HEADER_ROW_HEIGHT }}
              {...reorderHandlers}
            >
              {startHeaders.map((h, i) => renderHeader(h, i))}
              <div style={{ width: padLeft, flex: 'none' }} />
              {centerHeaders.slice(colStart, colEnd + 1).map((h, i) => renderHeader(h, startColumns.length + colStart + i))}
              <div style={{ width: padRight, flex: 'none' }} />
            </div>
            {filterRow && (
              <div className="tg-filter-row" role="row" style={{ height: FILTER_ROW_HEIGHT }}>
                {startColumns.map((c, i) => renderFilter(c, i === startColumns.length - 1))}
                <div style={{ width: padLeft, flex: 'none' }} />
                {centerColumns.slice(colStart, colEnd + 1).map((c) => renderFilter(c, false))}
                <div style={{ width: padRight, flex: 'none' }} />
              </div>
            )}
          </div>
          <div className="tg-body" style={{ height: rowVirtualizer.getTotalSize() }}>
            {virtualRows.map((v) => {
              const row = rows[v.index]
              const top = v.start - headerHeight
              if (!row) {
                return (
                  <div key="__loader" className="tg-row tg-loader-row" style={{ transform: `translateY(${top}px)`, width: totalWidth }}>
                    <span className="tg-sticky-label">Loading more…</span>
                  </div>
                )
              }
              const item = row.original
              if (item.kind === 'GROUP') {
                const check = groupCheckState(selection, item.group_path)
                return (
                  <GroupRow
                    key={row.id}
                    row={row}
                    item={item}
                    index={v.index}
                    top={top}
                    width={totalWidth}
                    expanded={row.getIsExpanded()}
                    checked={check.checked}
                    indeterminate={check.indeterminate}
                    column={table.getColumn(item.field)}
                    onSelect={(value) => meta.select({ groupPath: item.group_path }, value)}
                  />
                )
              }
              return (
                <DataRow
                  key={row.id}
                  row={row}
                  index={v.index}
                  top={top}
                  width={totalWidth}
                  startCount={startColumns.length}
                  colStart={colStart}
                  colEnd={colEnd}
                  padLeft={padLeft}
                  padRight={padRight}
                  selected={isRecordSelected(selection, item.group_path, row.id.slice(1))}
                  editingColumn={editing?.rowId === row.id ? editing.columnId : null}
                  editMode={editMode}
                  sizing={columnSizing}
                  columns={navColumns}
                />
              )
            })}
          </div>
        </div>
        {!data.isPending && rows.length === 0 && <div className="tg-empty" style={{ top: headerHeight }}>No results</div>}
        {data.error && <div className="tg-empty" style={{ top: headerHeight }}>{data.error.message}</div>}
      </div>
      <StatusBar
        totalRecords={totalRecords}
        totalItems={totalItems}
        grouped={grouping.length > 0}
        loaded={items.length}
        columns={navColumns.length}
        renderedColumns={virtualColumns.length}
        selected={selectedCount}
        actions={props.statusBarActions}
      />
      {/* Only mounted while open: a closed MUI Popover still renders on every scroll frame. */}
      {filterTarget && <FilterPopover target={filterTarget} onClose={() => setFilterTarget(null)} />}
    </>
  )
}
