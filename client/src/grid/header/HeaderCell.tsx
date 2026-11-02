import { memo } from 'react'
import { FlexRender } from '@tanstack/react-table'
import type { GridColumn, GridHeader } from '../core/features'
import { pinnedStyle } from '../core/pinning'
import type { SelectionState } from '../core/selection'
import { Icon } from '../icons/icons'

export interface HeaderCellProps {
  header: GridHeader
  ci: number
  dragging: boolean
  dropSide?: 'before' | 'after'
  /** Must be stable so memo holds. */
  onFilter?: (column: GridColumn, anchor: HTMLElement) => void
  // Derived state passed as props so the memo re-renders when it changes.
  sorted: false | 'asc' | 'desc'
  sortIndex: number
  multiSort: boolean
  size: number
  resizing: boolean
  filtered: boolean
  isLastPinned: boolean
  pinnedOffset: number | undefined
  /** Select column only. Not read directly; the select-all checkbox (header render fn) reads it from table meta. */
  selection: SelectionState | undefined
}

export const HeaderCell = memo(function HeaderCell({ header, ci, dragging, dropSide, onFilter, sorted, sortIndex, multiSort, size, resizing, filtered, isLastPinned, pinnedOffset }: HeaderCellProps) {
  const column = header.column
  const pin = pinnedStyle(pinnedOffset, isLastPinned)
  const resize = header.getResizeHandler()
  // Pinned columns keep their place; everything else can be dragged among the unpinned ones.
  const reorderable = !column.getIsPinned()
  return (
    <div
      className={`tg-th${pin.className}`}
      role="columnheader"
      data-ci={ci}
      data-column-id={column.id}
      data-reorderable={reorderable ? 'true' : undefined}
      data-dragging={dragging ? 'true' : undefined}
      data-drop={dropSide}
      draggable={reorderable}
      aria-sort={sorted ? (sorted === 'asc' ? 'ascending' : 'descending') : undefined}
      style={{ ...pin.style, width: size }}
    >
      {column.getCanSort() ? (
        <button type="button" className="tg-th-label" onClick={column.getToggleSortingHandler()} title="Sort (shift-click to add)">
          <span className="tg-th-text">
            <FlexRender header={header} />
          </span>
          {sorted && <Icon name={sorted === 'asc' ? 'arrow-up' : 'arrow-down'} className="tg-sort" />}
          {sorted && multiSort && <span className="tg-sort-index">{sortIndex + 1}</span>}
        </button>
      ) : (
        <div className="tg-th-label">
          <FlexRender header={header} />
        </div>
      )}
      {onFilter && column.getCanFilter() && (
        <button
          type="button"
          className="tg-th-filter"
          data-active={filtered ? 'true' : undefined}
          aria-label="Filter"
          onClick={(e) => onFilter(column, e.currentTarget.parentElement!)}
        >
          <Icon name="filter" />
        </button>
      )}
      {column.getCanResize() && (
        <div
          className="tg-resizer"
          data-resizing={resizing ? 'true' : undefined}
          // preventDefault keeps the mousedown from starting a column drag.
          onMouseDown={(e) => {
            e.preventDefault()
            resize(e)
          }}
          onTouchStart={resize}
          onDoubleClick={() => column.resetSize()}
        />
      )}
    </div>
  )
})
