import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { useTable, type ColumnSizingState } from '@tanstack/react-table'
import { selectColumn } from '../cells/selectColumn'
import { GridCell } from '../cells/GridCell'
import { features, type ColumnType, type GridColumn, type GridColumnDef, type GridRow, type GridTable, type GridTableMeta } from '../core/features'
import { recordIdOf, recordRowId } from '../core/rowId'
import { countSelected, setAll, setScope, type SelectionState } from '../core/selection'
import type { GridData, UseGridData } from '../data/dataSource'
import { useGridQuery } from './useGridQuery'
import { useGridState, type EditingCellAt, type GridStateOptions } from './useGridState'

export const DEFAULT_ROW_HEIGHT = 36

/** Moves focus to a cell (row index, `data-ci`), scrolling it into view. Set by the viewport. */
export type FocusCell = (r: number, ci: number) => void

export interface SelectionInfo {
  state: SelectionState
  count: number
}

export interface GridModelOptions<T> extends GridStateOptions {
  columns: Array<GridColumnDef<T>>
  /**
   * Loads pages and saves edits, e.g. `tanstackDataSource(…)` or `rtkDataSource(…)`.
   * Must keep the same identity across renders.
   */
  useData: UseGridData<T>
  getRecordId: (record: T) => string
  editMode?: boolean
  /** Body row height in px (default 36). */
  rowHeight?: number
  /** Column ids pinned to the start, after the selection column. */
  pinnedColumns?: Array<string>
  pageSize?: number
  onSelectionChange?: (selection: SelectionInfo) => void
  onError?: (error: Error) => void
}

/** Everything the viewport renders from. Changes on state and data changes, never on scroll. */
export interface GridModel {
  table: GridTable
  rows: Array<GridRow>
  startColumns: Array<GridColumn>
  centerColumns: Array<GridColumn>
  /** Start-pinned columns followed by the center columns: the `data-ci` index space. */
  navColumns: Array<GridColumn>
  columnSizing: ColumnSizingState
  totalWidth: number
  startWidth: number
  centerWidth: number
  rowHeight: number
  editMode: boolean
  /** Edit mode is on and the data source can save. */
  canUpdate: boolean
  selection: SelectionState
  editing: EditingCellAt | null
  setEditing: (editing: EditingCellAt | null) => void
  meta: GridTableMeta
  focusRef: RefObject<FocusCell>
  /** Ids of the consumer's columns in definition order (no selection column). */
  columnIds: Array<string>
  columnOrder: Array<string>
  setColumnOrder: (order: Array<string>) => void
  /** Changes whenever filters, grouping or sorting change. */
  resultKey: string
  data: Omit<GridData<unknown>, 'pages' | 'update'>
  totalItems: number
}

/** Counts for the status bar. Memoised: changes on load and selection only. */
export interface GridStatus {
  totalRecords: number
  /** Rows including group rows. */
  totalItems: number
  grouped: boolean
  loaded: number
  columns: number
  selected: number
}

/**
 * Column types whose filter is a select (native or popover button). Their
 * minimum width keeps "All" + chevron inside the filter cell's padding:
 * 16 cell padding + 2 border + 8 input padding + ~20 text + 4 gap + 18 chevron (~68), with room for short labels.
 */
const SELECT_FILTER_TYPES = new Set<ColumnType | undefined>(['boolean', 'enum', 'status', 'icon'])
const SELECT_FILTER_MIN_SIZE = 100
const serverSideFilter = () => true

/**
 * Headless grid: state, server data and the TanStack table, wired together.
 * Returns the model for the viewport and the counts for the status bar.
 */
export function useGridModel(props: GridModelOptions<unknown>): { model: GridModel; status: GridStatus } {
  const { useData, getRecordId, onError, onSelectionChange } = props
  const editMode = !!props.editMode
  const pageSize = props.pageSize ?? 200
  const rowHeight = props.rowHeight ?? DEFAULT_ROW_HEIGHT

  const state = useGridState(props)
  const { grouping, sorting, columnFilters, columnOrder, expanded, selection, editing, setSelection, setEditing } = state

  const query = useGridQuery({
    useData,
    getRecordId,
    query: { columnFilters, sorting, grouping, expanded },
    pageSize,
    resultKey: state.resultKey,
    onError,
  })
  const { items, commit } = query

  // -- table ------------------------------------------------------------------

  const columns = useMemo(
    () => [
      selectColumn,
      ...(props.columns as Array<GridColumnDef<unknown>>).map((c) =>
        c.minSize === undefined && SELECT_FILTER_TYPES.has(c.meta?.type) ? { ...c, minSize: SELECT_FILTER_MIN_SIZE } : c,
      ),
    ],
    [props.columns],
  )
  const columnIds = useMemo(() => props.columns.map((c) => c.id!), [props.columns])
  const columnPinning = useMemo(() => ({ start: ['select', ...(props.pinnedColumns ?? [])], end: [] }), [props.pinnedColumns])

  const focusRef = useRef<FocusCell>(() => {})
  // Read by `stopEdit`, so it never needs a side effect inside a state updater.
  const editingRef = useRef(editing)
  useLayoutEffect(() => {
    editingRef.current = editing
  })

  const select = useCallback<GridTableMeta['select']>(
    (scope, value) => setSelection((s) => (scope ? setScope(s, scope, value) : setAll(value))),
    [setSelection],
  )
  const stopEdit = useCallback(
    (refocus: boolean) => {
      const current = editingRef.current
      setEditing(null)
      if (current && refocus) focusRef.current(current.r, current.ci)
    },
    [setEditing],
  )

  const meta = useMemo<GridTableMeta>(
    () => ({
      editMode,
      editing,
      selection,
      select,
      stopEdit,
      commit: (rowId, columnId, value) => commit?.(recordIdOf(rowId), { [columnId]: value }),
    }),
    [editMode, editing, selection, select, stopEdit, commit],
  )

  const table = useTable({
    features,
    columns,
    data: items,
    getRowId: (item) => (item.kind === 'GROUP' ? item.group_path : recordRowId(getRecordId(item.record))),
    getRowCanExpand: (row) => row.original.kind === 'GROUP',
    state: { sorting, columnFilters, columnOrder, grouping, expanded, columnPinning },
    onSortingChange: state.setSorting,
    onColumnOrderChange: state.setColumnOrder,
    onColumnFiltersChange: state.setColumnFilters,
    onExpandedChange: (updater) => {
      query.keepLoaded()
      state.setExpanded(updater)
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

  const startColumns = table.getStartVisibleLeafColumns()
  const centerColumns = table.getCenterVisibleLeafColumns()
  const navColumns = useMemo(() => [...startColumns, ...centerColumns], [startColumns, centerColumns])

  // -- selection output -------------------------------------------------------

  const { totalRecords, totalItems, groupCounts } = query
  const selected = useMemo(() => countSelected(selection, totalRecords, groupCounts), [selection, totalRecords, groupCounts])
  useEffect(() => {
    onSelectionChange?.({ state: selection, count: selected })
  }, [selection, selected, onSelectionChange])

  const status = useMemo<GridStatus>(
    () => ({ totalRecords, totalItems, grouped: grouping.length > 0, loaded: items.length, columns: navColumns.length, selected }),
    [totalRecords, totalItems, grouping.length, items.length, navColumns.length, selected],
  )

  const { data } = query
  return {
    model: {
      table,
      rows: table.getRowModel().rows,
      startColumns,
      centerColumns,
      navColumns,
      columnSizing: table.state.columnSizing,
      totalWidth: table.getTotalSize(),
      startWidth: table.getStartTotalSize(),
      centerWidth: table.getCenterTotalSize(),
      rowHeight,
      editMode,
      canUpdate: editMode && !!commit,
      selection,
      editing,
      setEditing,
      meta,
      focusRef,
      columnIds,
      columnOrder,
      setColumnOrder: state.setColumnOrder,
      resultKey: state.resultKey,
      data,
      totalItems,
    },
    status,
  }
}
