import type { KeyboardEvent, MouseEvent, RefObject } from 'react'
import type { Virtualizer } from '@tanstack/react-virtual'
import type { EditingCell, GridColumn, GridItem, GridRow, GridTableMeta } from '../core/features'
import { groupCheckState, isRecordSelected, type SelectionState } from '../core/selection'

export type FocusCell = (r: number, ci: number) => void

interface GridKeyboardOptions {
  rows: Array<GridRow>
  /** Start-pinned columns followed by the center columns: the `data-ci` index space. */
  navColumns: Array<GridColumn>
  startCount: number
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>
  columnVirtualizer: Virtualizer<HTMLDivElement, Element>
  scrollRef: RefObject<HTMLDivElement | null>
  /** Assigned here on every render; `meta.stopEdit` calls it to restore focus. */
  focusRef: RefObject<FocusCell>
  meta: GridTableMeta
  selection: SelectionState
  /** Edit mode is on and the data source can save. */
  canUpdate: boolean
  setEditing: (editing: EditingCell & { r: number; ci: number }) => void
}

/**
 * Keyboard navigation, selection and editing, delegated to the scroller (no
 * per-cell handlers). Cells are located by their `data-row` / `data-ci`.
 */
export function useGridKeyboard(o: GridKeyboardOptions) {
  const { rows, navColumns, meta, selection, focusRef } = o

  focusRef.current = (r, ci) => {
    const row = Math.max(0, Math.min(rows.length - 1, r))
    const col = Math.max(0, Math.min(navColumns.length - 1, ci))
    o.rowVirtualizer.scrollToIndex(row)
    if (col >= o.startCount) o.columnVirtualizer.scrollToIndex(col - o.startCount)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const root = o.scrollRef.current
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
    else o.setEditing({ rowId: row.id, columnId: column.id, seed, r, ci })
  }

  const canEdit = (row: GridRow | undefined, column: GridColumn | undefined): row is GridRow =>
    o.canUpdate && row?.original.kind === 'RECORD' && !!column?.columnDef.meta?.editable

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
        const path = (row.original as Extract<GridItem, { kind: 'GROUP' }>).group_path
        meta.select({ groupPath: path }, !groupCheckState(selection, path).checked)
      }
      return
    }
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    // Selection behaves the same with and without edit mode: Space on the checkbox
    // cell, or on any cell that Space would not edit.
    if (e.key === ' ' && (column?.id === 'select' || !canEdit(row, column))) {
      e.preventDefault()
      const item = row.original as Extract<GridItem, { kind: 'RECORD' }>
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

  // A single click on an editable cell opens its editor (booleans toggle directly).
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const hit = locate(e.target)
    if (!hit?.row) return
    if ((e.target as HTMLElement).closest('.tg-expander')) return hit.row.toggleExpanded()
    if ((e.target as HTMLElement).closest('.tg-editor')) return
    if (canEdit(hit.row, hit.column)) startEdit(hit.row, hit.column!, hit.r, hit.ci)
  }

  return { onKeyDown, onClick }
}
