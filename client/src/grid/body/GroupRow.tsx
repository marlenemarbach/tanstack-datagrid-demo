import { memo } from 'react'
import { Checkbox } from '../cells/Checkbox'
import { renderValue } from '../cells/format'
import type { GridColumn, GridItem, GridRow } from '../core/features'
import { Icon } from '../icons/icons'

export interface GroupRowProps {
  row: GridRow
  item: Extract<GridItem, { kind: 'GROUP' }>
  index: number
  top: number
  width: number
  expanded: boolean
  checked: boolean
  indeterminate: boolean
  column: GridColumn | undefined
  onSelect: (value: boolean) => void
}

export const GroupRow = memo(
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
    a.row === b.row &&
    a.column === b.column && a.top === b.top && a.width === b.width && a.expanded === b.expanded && a.checked === b.checked && a.indeterminate === b.indeterminate && a.index === b.index,
)
