import { useMemo, useState } from 'react'
import { useTable, type ColumnFiltersState, type ColumnPinningState, type ExpandedState, type SortingState } from '@tanstack/react-table'
import type { Order, QueryItem } from '../api/orders'
import { orderColumns } from '../columns'
import { features, type GridColumnDef, type GridTableMeta, type SelectionState } from '../grid'

const noRows: Array<QueryItem<unknown>> = []
const serverSideFilter = () => true
const noop = () => {}
const pick = (ids?: Array<string>) => (ids ? ids.map((id) => orderColumns.find((c) => c.id === id)!) : orderColumns)
const emptySelection: SelectionState = { all: false, overrides: {} }

export interface DemoTableOptions {
  initialSorting?: SortingState
  /** Order columns to include (in this order); defaults to all. */
  columnIds?: Array<string>
  /** Rows to show; defaults to none (enough for header and filter parts). */
  items?: Array<QueryItem<Order>>
  /** Extra columns in front of the order columns, e.g. the selection column. */
  leadingColumns?: Array<GridColumnDef<unknown>>
  /** Default cell renderer, e.g. the grid's `GridCell`. */
  cell?: GridColumnDef<unknown>['cell']
  columnPinning?: ColumnPinningState
  expanded?: ExpandedState
  /** Overrides for the grid's table meta (selection, edit state, callbacks). */
  meta?: Partial<GridTableMeta>
}

/**
 * A table over the order columns, so grid parts get real TanStack headers,
 * rows and columns with live state, without the grid around them.
 */
export function useDemoTable(initialFilters: ColumnFiltersState = [], options: DemoTableOptions = {}) {
  const [columnFilters, setColumnFilters] = useState(initialFilters)
  const [sorting, setSorting] = useState(options.initialSorting ?? [])
  const idsKey = options.columnIds?.join()
  // Memoised like the grid's columns, so memoised parts keep their memo.
  const columns = useMemo(() => [...(options.leadingColumns ?? []), ...pick(idsKey?.split(','))], [options.leadingColumns, idsKey])
  const table = useTable({
    features,
    columns: columns as never,
    data: (options.items ?? noRows) as Array<QueryItem<unknown>>,
    getRowId: (item) => (item.kind === 'GROUP' ? item.group_path : `#${(item.record as Order).order_id}`),
    getRowCanExpand: (row) => row.original.kind === 'GROUP',
    state: { columnFilters, sorting, columnPinning: options.columnPinning ?? { start: [], end: [] }, expanded: options.expanded ?? {} },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    manualFiltering: true,
    manualSorting: true,
    manualExpanding: true,
    enableMultiSort: true,
    columnResizeMode: 'onChange',
    defaultColumn: { filterFn: serverSideFilter, size: 150, minSize: 60, ...(options.cell ? { cell: options.cell } : {}) },
    meta: { editMode: false, editing: null, selection: emptySelection, select: noop, stopEdit: noop, commit: noop, ...options.meta },
  })
  return { table, columnFilters, sorting }
}
