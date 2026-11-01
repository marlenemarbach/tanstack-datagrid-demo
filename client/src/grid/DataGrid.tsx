import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactElement } from 'react'
import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'
import { keepPreviousData, useInfiniteQuery, useMutation, useQueryClient, type InfiniteData, type QueryKey } from '@tanstack/react-query'
import { flexRender, useTable, type Column, type ColumnFiltersState, type ExpandedState, type Header, type Row, type SortingState } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Filter, FilterValue, QueryItem, QueryRequest, QueryResponse } from '../api/orders'
import { Checkbox, GridCell, renderValue } from './cells'
import { features, type EditingCell, type Features, type GridColumnDef, type GridTableMeta } from './features'
import { FilterPopover, type FilterTarget } from './FilterPopover'
import { FilterCell } from './FilterRow'
import { Icon } from './icons'
import {
  allCheckState,
  countSelected,
  emptySelection,
  groupCheckState,
  isRecordSelected,
  setAll,
  setScope,
  type SelectionState,
} from './selection'

const ROW_HEIGHT = 36
const HEADER_ROW_HEIGHT = 40
const FILTER_ROW_HEIGHT = 36
const MAX_RELOAD = 5000

type Item = QueryItem<unknown>
type GridRow = Row<Features, Item>
type GridColumn = Column<Features, Item, unknown>
type PageParam = { cursor?: string; limit: number }

export interface SelectionInfo {
  state: SelectionState
  count: number
}

export interface DataGridProps<T> {
  /** Prefix for every query; also used to patch the cache after edits. */
  queryKey: QueryKey
  columns: Array<GridColumnDef<T>>
  fetchPage: (request: QueryRequest, signal: AbortSignal) => Promise<QueryResponse<T>>
  updateRecord?: (id: string, patch: Partial<T>) => Promise<T>
  getRecordId: (record: T) => string
  search?: string
  grouping?: Array<string>
  editMode?: boolean
  /** Column ids pinned to the start, after the selection column. */
  pinnedColumns?: Array<string>
  pageSize?: number
  /** One search field per column below the header (default true). */
  filterRow?: boolean
  /** All visual styling lives here (class selectors), not on individual cells. */
  sx?: SxProps<Theme>
  onSelectionChange?: (selection: SelectionInfo) => void
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
    <Box className="tg-root" sx={props.sx} data-edit-mode={props.editMode ? 'true' : undefined}>
      <GridBody {...(props as unknown as DataGridProps<unknown>)} />
    </Box>
  )
}) as <T>(props: DataGridProps<T>) => ReactElement

const selectColumn: GridColumnDef<unknown> = {
  id: 'select',
  size: 44,
  enableSorting: false,
  enableColumnFilter: false,
  enableResizing: false,
  // Always present, independent of edit mode, visibility or grouping.
  enableHiding: false,
  enableGrouping: false,
  header: ({ table }) => {
    const meta = table.options.meta!
    const { checked, indeterminate } = allCheckState(meta.selection)
    return <Checkbox label="Select all" checked={checked} indeterminate={indeterminate} onToggle={(v) => meta.select(null, v)} />
  },
  cell: ({ row, table }) => {
    const item = row.original
    if (item.kind !== 'RECORD') return null
    const meta = table.options.meta!
    const id = row.id.slice(1)
    return (
      <Checkbox
        label="Select row"
        checked={isRecordSelected(meta.selection, item.group_path, id)}
        onToggle={(v) => meta.select({ groupPath: item.group_path, id }, v)}
      />
    )
  },
}

function GridBody(props: DataGridProps<unknown>) {
  const { queryKey, fetchPage, getRecordId, updateRecord, onError, onSelectionChange } = props
  const search = props.search ?? ''
  const grouping = props.grouping ?? EMPTY
  const editMode = !!props.editMode
  const pageSize = props.pageSize ?? 200
  const filterRow = props.filterRow ?? true
  const headerHeight = HEADER_ROW_HEIGHT + (filterRow ? FILTER_ROW_HEIGHT : 0)
  const queryClient = useQueryClient()

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [selection, setSelection] = useState<SelectionState>(emptySelection)
  const [editing, setEditing] = useState<(EditingCell & { r: number; ci: number }) | null>(null)
  const [filterTarget, setFilterTarget] = useState<FilterTarget | null>(null)
  /** How many items to request again after an expand/collapse, so the scroll position survives. */
  const reloadSize = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset dependent state whenever the result set changes (render-time reset, no extra effect pass).
  const shape = JSON.stringify([columnFilters, search, grouping])
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
      search: search || undefined,
      sort: sorting.map((s) => `${s.desc ? '-' : '+'}${s.id}`),
      group_by: grouping,
      expanded_groups: expanded === true ? [] : Object.keys(expanded).filter((k) => expanded[k]),
    }),
    [columnFilters, search, sorting, grouping, expanded],
  )

  const query = useInfiniteQuery({
    queryKey: [...queryKey, request],
    queryFn: ({ pageParam, signal }) => fetchPage({ ...request, ...pageParam }, signal),
    initialPageParam: { limit: Math.min(MAX_RELOAD, Math.max(pageSize, reloadSize.current)) } as PageParam,
    getNextPageParam: (last): PageParam | undefined => (last.next ? { cursor: last.next, limit: pageSize } : undefined),
    placeholderData: keepPreviousData,
  })

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? EMPTY, [query.data])
  const lastPage = query.data?.pages.at(-1)
  const totalRecords = lastPage?.total_records ?? 0
  const totalItems = lastPage?.total_items ?? 0

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) if (item.kind === 'GROUP') counts.set(item.group_path, item.count)
    return counts
  }, [items])

  const patchCache = useCallback(
    (id: string, update: (record: unknown) => unknown) => {
      queryClient.setQueriesData<InfiniteData<QueryResponse<unknown>>>({ queryKey }, (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                items: page.items.map((it) => (it.kind === 'RECORD' && getRecordId(it.record) === id ? { ...it, record: update(it.record) } : it)),
              })),
            }
          : old,
      )
    },
    [queryClient, queryKey, getRecordId],
  )

  const mutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) => updateRecord!(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey })
      const snapshot = queryClient.getQueriesData({ queryKey })
      patchCache(id, (record) => ({ ...(record as object), ...patch }))
      return { snapshot }
    },
    onError: (error, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data))
      onError?.(error)
    },
    onSuccess: (record, { id }) => patchCache(id, () => record),
  })

  // -- table ----------------------------------------------------------------

  const columns = useMemo(() => [selectColumn, ...(props.columns as Array<GridColumnDef<unknown>>)], [props.columns])
  const columnPinning = useMemo(() => ({ start: ['select', ...(props.pinnedColumns ?? [])], end: [] }), [props.pinnedColumns])

  const focusRef = useRef<(r: number, ci: number) => void>(() => {})

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
        if (!updateRecord) return
        mutation.mutate({ id: rowId.slice(1), patch: { [columnId]: value } })
      },
    }),
    // `mutation.mutate` is stable.
    [editMode, editing, selection, updateRecord],
  )

  const table = useTable({
    features,
    columns,
    data: items,
    getRowId: (item) => (item.kind === 'GROUP' ? item.group_path : `#${getRecordId(item.record)}`),
    getRowCanExpand: (row) => row.original.kind === 'GROUP',
    state: { sorting, columnFilters, globalFilter: search, grouping, expanded, columnPinning },
    onSortingChange: setSorting,
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

  const hasMore = !!query.hasNextPage
  const rowVirtualizer = useVirtualizer({
    count: rows.length + (hasMore ? 1 : 0),
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
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
  const { fetchNextPage, isFetchingNextPage, isPlaceholderData } = query
  useEffect(() => {
    if (hasMore && !isFetchingNextPage && !isPlaceholderData && lastVirtualIndex >= rows.length - 20) void fetchNextPage()
  }, [hasMore, isFetchingNextPage, isPlaceholderData, lastVirtualIndex, rows.length, fetchNextPage])

  // -- selection output -------------------------------------------------------

  const selectedCount = useMemo(() => countSelected(selection, totalRecords, groupCounts), [selection, totalRecords, groupCounts])
  useEffect(() => {
    onSelectionChange?.({ state: selection, count: selectedCount })
  }, [selection, selectedCount, onSelectionChange])

  // -- keyboard navigation & editing (delegated, no per-cell handlers) --------

  focusRef.current = (r, ci) => {
    const row = Math.max(0, Math.min(rows.length - 1, r))
    const col = Math.max(0, Math.min(navColumns.length - 1, ci))
    rowVirtualizer.scrollToIndex(row)
    if (col >= startColumns.length) columnVirtualizer.scrollToIndex(col - startColumns.length)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const root = scrollRef.current
        const el = root?.querySelector<HTMLElement>(`[data-row="${row}"] [data-ci="${col}"]`) ?? root?.querySelector<HTMLElement>(`[data-row="${row}"]`)
        el?.focus({ preventScroll: true })
      }),
    )
  }

  const locate = (target: EventTarget) => {
    const el = target as HTMLElement
    const rowEl = el.closest<HTMLElement>('[data-row]')
    if (!rowEl) return null
    const cellEl = el.closest<HTMLElement>('[data-ci]')
    const r = Number(rowEl.dataset.row)
    const ci = cellEl ? Number(cellEl.dataset.ci) : -1
    return { r, ci, row: rows[r], column: ci >= 0 ? navColumns[ci] : undefined }
  }

  const startEdit = (row: GridRow, column: GridColumn, r: number, ci: number, seed?: string) => {
    if (column.columnDef.meta?.type === 'boolean') meta.commit(row.id, column.id, !row.getValue(column.id))
    else setEditing({ rowId: row.id, columnId: column.id, seed, r, ci })
  }

  const canEdit = (row: GridRow | undefined, column: GridColumn | undefined): row is GridRow =>
    editMode && !!updateRecord && row?.original.kind === 'RECORD' && !!column?.columnDef.meta?.editable

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const hit = locate(e.target)
    if (!hit?.row) return
    const { r, ci, row, column } = hit
    const isGroup = row.original.kind === 'GROUP'
    const nav: Record<string, [number, number]> = { ArrowDown: [1, 0], ArrowUp: [-1, 0], ArrowRight: [0, 1], ArrowLeft: [0, -1] }
    const move = nav[e.key]
    if (move) {
      e.preventDefault()
      if (isGroup && move[1] !== 0) row.toggleExpanded(move[1] > 0)
      else focusRef.current(r + move[0], Math.max(ci, 0) + move[1])
      return
    }
    if (isGroup) {
      if (e.key === 'Enter') row.toggleExpanded()
      if (e.key === ' ') {
        e.preventDefault()
        const path = (row.original as Extract<Item, { kind: 'GROUP' }>).group_path
        meta.select({ groupPath: path }, !groupCheckState(selection, path).checked)
      }
      return
    }
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    // Selection behaves the same with and without edit mode: Space on the checkbox
    // cell, or on any cell that Space would not edit.
    if (e.key === ' ' && (column?.id === 'select' || !canEdit(row, column))) {
      e.preventDefault()
      const item = row.original as Extract<Item, { kind: 'RECORD' }>
      const id = row.id.slice(1)
      meta.select({ groupPath: item.group_path, id }, !isRecordSelected(selection, item.group_path, id))
      return
    }
    if (!column || !canEdit(row, column)) return
    if (e.key === 'Enter' || e.key === 'F2' || (e.key === ' ' && column.columnDef.meta?.type === 'boolean')) {
      e.preventDefault()
      startEdit(row, column, r, ci)
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault()
      startEdit(row, column, r, ci, '')
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      startEdit(row, column, r, ci, e.key)
    }
  }

  const onDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    const hit = locate(e.target)
    if (hit && hit.column?.columnDef.meta?.type !== 'boolean' && canEdit(hit.row, hit.column)) startEdit(hit.row, hit.column!, hit.r, hit.ci)
  }

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const hit = locate(e.target)
    if (!hit?.row) return
    if ((e.target as HTMLElement).closest('.tg-expander')) return hit.row.toggleExpanded()
    if (hit.column?.columnDef.meta?.type === 'boolean' && canEdit(hit.row, hit.column)) startEdit(hit.row, hit.column, hit.r, hit.ci)
  }

  // -- render -----------------------------------------------------------------

  const startHeaders = table.getStartLeafHeaders()
  const centerHeaders = table.getCenterLeafHeaders()
  const renderHeader = (header: Header<Features, Item, unknown>, ci: number) => (
    <HeaderCell key={header.id} header={header} ci={ci} table={table} onFilter={(anchor) => setFilterTarget({ column: header.column, anchor })} />
  )

  const renderFilter = (column: GridColumn, isLastPinned: boolean) => (
    <FilterCell
      key={column.id}
      column={column}
      value={column.getFilterValue() as FilterValue | undefined}
      width={column.getSize()}
      pinnedOffset={column.getIsPinned() === 'start' ? column.getStart('start') : undefined}
      isLastPinned={isLastPinned}
    />
  )

  return (
    <>
      <div className="tg-progress" role="progressbar" aria-busy={query.isFetching} data-active={query.isFetching ? 'true' : undefined} />
      <div ref={scrollRef} className="tg-scroller" role="grid" aria-rowcount={totalItems} aria-colcount={navColumns.length} onKeyDown={onKeyDown} onClick={onClick} onDoubleClick={onDoubleClick}>
        <div className="tg-canvas" style={{ width: totalWidth }}>
          <div className="tg-header" style={{ width: totalWidth, height: headerHeight }}>
            <div className="tg-header-row" role="row" style={{ height: HEADER_ROW_HEIGHT }}>
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
                />
              )
            })}
          </div>
        </div>
        {!query.isPending && rows.length === 0 && <div className="tg-empty" style={{ top: headerHeight }}>No results</div>}
        {query.isError && <div className="tg-empty" style={{ top: headerHeight }}>{query.error.message}</div>}
      </div>
      <div className="tg-status-bar">
        <span>{totalRecords.toLocaleString()} records</span>
        {grouping.length > 0 && <span>{totalItems.toLocaleString()} rows incl. groups</span>}
        <span>{items.length.toLocaleString()} loaded</span>
        <span>{navColumns.length} columns ({virtualColumns.length} rendered)</span>
        {selectedCount > 0 && <span className="tg-status-bar-selected">{selectedCount.toLocaleString()} selected</span>}
      </div>
      {/* Only mounted while open: a closed MUI Popover still renders on every scroll frame. */}
      {filterTarget && <FilterPopover target={filterTarget} onClose={() => setFilterTarget(null)} />}
    </>
  )
}

// ---------------------------------------------------------------------------

type GridTable = ReturnType<typeof useTable<Features, Item>>

function pinnedStyle(column: GridColumn, isLast: boolean) {
  return column.getIsPinned() === 'start'
    ? { className: isLast ? ' tg-pinned tg-pinned-last' : ' tg-pinned', style: { insetInlineStart: column.getStart('start') } }
    : { className: '', style: undefined }
}

function HeaderCell({ header, ci, table, onFilter }: { header: Header<Features, Item, unknown>; ci: number; table: GridTable; onFilter: (anchor: HTMLElement) => void }) {
  const column = header.column
  const sorted = column.getIsSorted()
  const sortIndex = column.getSortIndex()
  const pin = pinnedStyle(column, column.id === table.getStartVisibleLeafColumns().at(-1)?.id)
  const resize = header.getResizeHandler()
  return (
    <div
      className={`tg-th${pin.className}`}
      role="columnheader"
      data-ci={ci}
      aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : undefined}
      style={{ ...pin.style, width: header.getSize() }}
    >
      {column.getCanSort() ? (
        <button type="button" className="tg-th-label" onClick={column.getToggleSortingHandler()} title="Sort (shift-click to add)">
          <span className="tg-th-text">
            <table.FlexRender header={header} />
          </span>
          {sorted && <Icon name={sorted === 'asc' ? 'arrow-up' : 'arrow-down'} className="tg-sort" />}
          {sorted && table.state.sorting.length > 1 && <span className="tg-sort-index">{sortIndex + 1}</span>}
        </button>
      ) : (
        <div className="tg-th-label">
          <table.FlexRender header={header} />
        </div>
      )}
      {column.getCanFilter() && (
        <button
          type="button"
          className="tg-th-filter"
          data-active={column.getIsFiltered() ? 'true' : undefined}
          aria-label="Filter"
          onClick={(e) => onFilter(e.currentTarget.parentElement!)}
        >
          <Icon name="filter" />
        </button>
      )}
      {column.getCanResize() && (
        <div
          className="tg-resizer"
          data-resizing={column.getIsResizing() ? 'true' : undefined}
          onMouseDown={resize}
          onTouchStart={resize}
          onDoubleClick={() => column.resetSize()}
        />
      )}
    </div>
  )
}

interface DataRowProps {
  row: GridRow
  index: number
  top: number
  width: number
  startCount: number
  colStart: number
  colEnd: number
  padLeft: number
  padRight: number
  selected: boolean
  editingColumn: string | null
  editMode: boolean
  /** Not read directly; a new object forces re-render when widths change. */
  sizing: unknown
}

/** Memoised: vertical scrolling only renders rows entering the viewport. */
const DataRow = memo(function DataRow(p: DataRowProps) {
  const startCells = p.row.getStartVisibleCells()
  const centerCells = p.row.getCenterVisibleCells()
  const renderCell = (cell: (typeof startCells)[number], ci: number, isLastPinned: boolean) => {
    const column = cell.column
    const meta = column.columnDef.meta
    const pin = pinnedStyle(column, isLastPinned)
    return (
      <div
        key={cell.id}
        className={`tg-cell${pin.className}`}
        role="gridcell"
        tabIndex={-1}
        data-ci={ci}
        data-type={meta?.type}
        data-align={meta?.align ?? (meta?.type === 'number' ? 'end' : undefined)}
        data-editable={p.editMode && meta?.editable ? 'true' : undefined}
        data-editing={p.editingColumn === column.id ? 'true' : undefined}
        style={{ ...pin.style, width: column.getSize() }}
      >
        {/* flexRender, not <FlexRender>: the latter blanks cells of grouped columns (placeholders). */}
        {flexRender(column.columnDef.cell, cell.getContext())}
      </div>
    )
  }
  return (
    <div
      className="tg-row"
      role="row"
      data-row={p.index}
      aria-selected={p.selected}
      data-selected={p.selected ? 'true' : undefined}
      style={{ transform: `translateY(${p.top}px)`, width: p.width }}
    >
      {startCells.map((c, i) => renderCell(c, i, i === startCells.length - 1))}
      <div style={{ width: p.padLeft, flex: 'none' }} />
      {centerCells.slice(p.colStart, p.colEnd + 1).map((c, i) => renderCell(c, p.startCount + p.colStart + i, false))}
      <div style={{ width: p.padRight, flex: 'none' }} />
    </div>
  )
})

interface GroupRowProps {
  row: GridRow
  item: Extract<Item, { kind: 'GROUP' }>
  index: number
  top: number
  width: number
  expanded: boolean
  checked: boolean
  indeterminate: boolean
  column: GridColumn | undefined
  onSelect: (value: boolean) => void
}

const GroupRow = memo(
  function GroupRow(p: GroupRowProps) {
    const header = p.column?.columnDef.header
    return (
      <div
        className="tg-row tg-group-row"
        role="row"
        tabIndex={-1}
        data-row={p.index}
        data-depth={p.item.depth}
        aria-expanded={p.expanded}
        style={{ transform: `translateY(${p.top}px)`, width: p.width }}
      >
        <div className="tg-group-cell" style={{ paddingInlineStart: 12 + p.item.depth * 24 }}>
          <Checkbox label="Select group" checked={p.checked} indeterminate={p.indeterminate} onToggle={p.onSelect} />
          <button type="button" className="tg-expander" aria-label={p.expanded ? 'Collapse' : 'Expand'} tabIndex={-1}>
            <Icon name={p.expanded ? 'chevron-down' : 'chevron-right'} />
          </button>
          <span className="tg-group-label">{typeof header === 'string' ? header : p.item.field}</span>
          <span className="tg-group-value">{renderValue(p.column?.columnDef.meta, p.item.value)}</span>
          <span className="tg-group-count">{p.item.count.toLocaleString()}</span>
        </div>
      </div>
    )
  },
  // onSelect is recreated each render but only closes over the group path.
  (a, b) =>
    a.row === b.row && a.top === b.top && a.width === b.width && a.expanded === b.expanded && a.checked === b.checked && a.indeterminate === b.indeterminate && a.index === b.index,
)
