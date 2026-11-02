import { memo, type ReactNode } from 'react'

export interface StatusBarProps {
  totalRecords: number
  /** Rows including group rows; shown only when grouped. */
  totalItems: number
  grouped: boolean
  loaded: number
  columns: number
  renderedColumns: number
  selected: number
  /** Extra controls at the right end. */
  actions?: ReactNode
}

/** Counts below the grid. Memoised: it only changes on load, selection or horizontal scroll. */
export const StatusBar = memo(function StatusBar(p: StatusBarProps) {
  return (
    <div className="tg-status-bar">
      <span>{p.totalRecords.toLocaleString()} records</span>
      {p.grouped && <span>{p.totalItems.toLocaleString()} rows incl. groups</span>}
      <span>{p.loaded.toLocaleString()} loaded</span>
      <span>
        {p.columns} columns ({p.renderedColumns} rendered)
      </span>
      {p.selected > 0 && <span className="tg-status-bar-selected">{p.selected.toLocaleString()} selected</span>}
      {p.actions}
    </div>
  )
})
