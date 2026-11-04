import { memo, use, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { DataRow } from './body/DataRow'
import { GroupRow } from './body/GroupRow'
import { useGridKeyboard } from './body/useGridKeyboard'
import { GridStatsContext, useGridModelContext } from './context'
import type { GridColumn, GridHeader } from './core/features'
import { pinOffset } from './core/pinning'
import { recordIdOf } from './core/rowId'
import { groupCheckState, isRecordSelected } from './core/selection'
import type { FilterValue } from './core/types'
import { FilterCell } from './filters/FilterCell'
import { FilterPopover, type FilterTarget } from './filters/FilterPopover'
import { HeaderCell } from './header/HeaderCell'
import { useColumnReorder } from './header/useColumnReorder'

const HEADER_ROW_HEIGHT = 40
const FILTER_ROW_HEIGHT = 36

export interface GridViewportProps {
  /** One search field per column below the header (default true). */
  filterRow?: boolean
}

/**
 * The scrolling grid: header, filter row and virtualized body. The only part
 * that re-renders on scroll; it reads the model from `DataGrid.Root` and owns
 * nothing but view state (virtualizers, open filter popover).
 */
export const GridViewport = memo(function GridViewport({ filterRow = true }: GridViewportProps) {
  const m = useGridModelContext('Viewport')
  const { table, rows, startColumns, centerColumns, navColumns, columnSizing, totalWidth, startWidth, centerWidth, rowHeight, selection, editing, editMode, data } = m
  const stats = use(GridStatsContext)
  const headerHeight = HEADER_ROW_HEIGHT + (filterRow ? FILTER_ROW_HEIGHT : 0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [filterTarget, setFilterTarget] = useState<FilterTarget | null>(null)

  // A new result set starts at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [m.resultKey])

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

  // The status bar subscribes to this store; it is only notified when the count changes.
  useLayoutEffect(() => {
    stats?.set(virtualColumns.length)
  })

  // Infinite scroll: fetch the next page when the loader row comes into range.
  const lastVirtualIndex = virtualRows.at(-1)?.index ?? 0
  const { fetchNextPage, isFetchingNextPage, isStale } = data
  useEffect(() => {
    if (hasMore && !isFetchingNextPage && !isStale && lastVirtualIndex >= rows.length - 20) void fetchNextPage()
  }, [hasMore, isFetchingNextPage, isStale, lastVirtualIndex, rows.length, fetchNextPage])

  // -- keyboard navigation & editing (delegated, no per-cell handlers) --------

  const { onKeyDown, onClick } = useGridKeyboard({
    rows,
    navColumns,
    startCount: startColumns.length,
    rowVirtualizer,
    columnVirtualizer,
    scrollRef,
    focusRef: m.focusRef,
    meta: m.meta,
    selection,
    canUpdate: m.canUpdate,
    setEditing: m.setEditing,
  })

  // -- column reordering (native drag and drop, delegated on the header row) --

  const { dragColumn, dropTarget, handlers: reorderHandlers } = useColumnReorder(m.columnIds, m.columnOrder, m.setColumnOrder)

  // -- render -----------------------------------------------------------------

  // Stable, so memoised header and filter cells keep their memo.
  const openFilter = useCallback((column: GridColumn, anchor: HTMLElement) => setFilterTarget({ column, anchor }), [])

  const startHeaders = table.getStartLeafHeaders()
  const centerHeaders = table.getCenterLeafHeaders()
  const multiSort = table.state.sorting.length > 1
  const lastPinnedId = startColumns.at(-1)?.id
  const renderHeader = (header: GridHeader, ci: number) => (
    <HeaderCell
      key={header.id}
      header={header}
      ci={ci}
      sorted={header.column.getIsSorted()}
      sortIndex={header.column.getSortIndex()}
      multiSort={multiSort}
      size={header.getSize()}
      resizing={header.column.getIsResizing()}
      filtered={header.column.getIsFiltered()}
      isLastPinned={header.column.id === lastPinnedId}
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
      pinnedOffset={pinOffset(column)}
      isLastPinned={isLastPinned}
      onOpen={openFilter}
    />
  )

  return (
    <>
      <div className="tg-progress" role="progressbar" aria-busy={data.isFetching} data-active={data.isFetching ? 'true' : undefined} />
      <div ref={scrollRef} className="tg-scroller" role="grid" aria-rowcount={m.totalItems} aria-colcount={navColumns.length} onKeyDown={onKeyDown} onClick={onClick}>
        <div className="tg-canvas" style={{ width: totalWidth }}>
          <div className="tg-header" style={{ width: totalWidth, height: headerHeight }}>
            <div className="tg-header-row" role="row" style={{ height: HEADER_ROW_HEIGHT }} {...reorderHandlers}>
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
                    onSelect={(value) => m.meta.select({ groupPath: item.group_path }, value)}
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
                  selected={isRecordSelected(selection, item.group_path, recordIdOf(row.id))}
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
      {/* Only mounted while open: a closed MUI Popover still renders on every scroll frame. */}
      {filterTarget && <FilterPopover target={filterTarget} onClose={() => setFilterTarget(null)} />}
    </>
  )
})
