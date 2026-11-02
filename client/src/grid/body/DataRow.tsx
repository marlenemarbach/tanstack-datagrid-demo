import { memo } from 'react'
import type { GridRow } from '../core/features'
import { pinOffset } from '../core/pinning'
import { BodyCell } from './BodyCell'

export interface DataRowProps {
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
  /** Not read directly; a new array forces re-render when columns are reordered or (un)pinned. */
  columns: unknown
}

/** Memoised: vertical scrolling only renders rows entering the viewport. */
export const DataRow = memo(function DataRow(p: DataRowProps) {
  const startCells = p.row.getStartVisibleCells()
  const centerCells = p.row.getCenterVisibleCells()
  const renderCell = (cell: (typeof startCells)[number], ci: number, isLastPinned: boolean) => (
    <BodyCell
      key={cell.id}
      cell={cell}
      ci={ci}
      isLastPinned={isLastPinned}
      pinnedOffset={pinOffset(cell.column)}
      width={cell.column.getSize()}
      editMode={p.editMode}
      editing={p.editingColumn === cell.column.id}
      // Only the select cell reads it; other cells would re-render on every toggle.
      selected={cell.column.id === 'select' && p.selected}
    />
  )
  return (
    <div
      className="tg-row"
      role="row"
      data-row={p.index}
      data-alt={p.index % 2 ? 'true' : undefined}
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
