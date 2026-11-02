import { memo } from 'react'
import { flexRender } from '@tanstack/react-table'
import type { GridCellObj } from '../core/features'
import { pinnedStyle } from '../core/pinning'

/** Memoised: horizontal scrolling only renders cells entering the viewport. */
export const BodyCell = memo(function BodyCell(p: { cell: GridCellObj; ci: number; isLastPinned: boolean; pinnedOffset: number | undefined; width: number; editMode: boolean; editing: boolean; selected: boolean }) {
  const column = p.cell.column
  const meta = column.columnDef.meta
  const pin = pinnedStyle(p.pinnedOffset, p.isLastPinned)
  return (
    <div
      className={`tg-cell${pin.className}`}
      role="gridcell"
      tabIndex={-1}
      data-ci={p.ci}
      data-type={meta?.type}
      data-align={meta?.align ?? (meta?.type === 'number' ? 'end' : undefined)}
      data-editable={p.editMode && meta?.editable ? 'true' : undefined}
      data-editing={p.editing ? 'true' : undefined}
      style={{ ...pin.style, width: p.width }}
    >
      {/* flexRender, not <FlexRender>: the latter blanks cells of grouped columns (placeholders). */}
      {flexRender(column.columnDef.cell, p.cell.getContext())}
    </div>
  )
})
