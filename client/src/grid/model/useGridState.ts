import { useState } from 'react'
import type { ColumnFiltersState, ColumnOrderState, ExpandedState, SortingState } from '@tanstack/react-table'
import type { EditingCell } from '../core/features'
import { emptySelection, type SelectionState } from '../core/selection'
import { useControllable } from '../core/useControllable'

const EMPTY: Array<never> = []

/** The edited cell plus its position in the `data-row` / `data-ci` index space, to restore focus. */
export type EditingCellAt = EditingCell & { r: number; ci: number }

export interface GridStateOptions {
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
}

/**
 * Grid state: controllable query state plus expanded groups, selection and
 * the edited cell. Expanded groups and selection reset when the result set changes.
 */
export function useGridState(options: GridStateOptions) {
  const grouping = options.grouping ?? EMPTY
  const [sorting, setSorting] = useControllable(options.sorting, options.onSortingChange, EMPTY)
  const [columnFilters, setColumnFilters] = useControllable(options.columnFilters, options.onColumnFiltersChange, EMPTY)
  const [columnOrder, setColumnOrder] = useControllable(options.columnOrder, options.onColumnOrderChange, EMPTY)
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [selection, setSelection] = useState<SelectionState>(emptySelection)
  const [editing, setEditing] = useState<EditingCellAt | null>(null)

  // Compared by content, so a parent passing equal but new arrays does not reset anything.
  // Render-time reset: no extra effect pass.
  const shape = JSON.stringify([columnFilters, grouping])
  const [prevShape, setPrevShape] = useState(shape)
  if (shape !== prevShape) {
    setPrevShape(shape)
    setSelection(emptySelection)
    setExpanded({})
  }

  return {
    grouping,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    columnOrder,
    setColumnOrder,
    expanded,
    setExpanded,
    selection,
    setSelection,
    editing,
    setEditing,
    /** Changes whenever filters, grouping or sorting change, i.e. the result set starts over. */
    resultKey: shape + JSON.stringify(sorting),
  }
}
