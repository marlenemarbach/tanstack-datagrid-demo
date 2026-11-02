import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import { gridSx } from '../grid'

interface GridStylesProps {
  children: ReactNode
  inline?: boolean
  /** The grid root's options, as `DataGrid` sets them. */
  striped?: boolean
  columnBorders?: boolean
  editMode?: boolean
}

/**
 * The grid's class-based styles live on its root (`.tg-root` + `gridSx`).
 * Grid parts shown on their own need the same ancestor to be styled.
 */
export function GridStyles({ children, inline, striped, columnBorders, editMode }: GridStylesProps) {
  return (
    // Inline style: keeps the story padding out of the grid's `sx`.
    <Box
      className="tg-root"
      sx={gridSx}
      data-striped-rows={striped ? 'true' : undefined}
      data-column-borders={columnBorders ? 'true' : undefined}
      data-edit-mode={editMode ? 'true' : undefined}
      style={{ padding: 16, gap: 12, flex: 'none', display: inline ? 'inline-flex' : undefined }}
    >
      {children}
    </Box>
  )
}

/** Scroll container + body for row stories; rows are absolutely positioned, so the body needs a height. */
export function RowsFrame({ children, rows, width, rowHeight = 36 }: { children: ReactNode; rows: number; width: number; rowHeight?: number }) {
  return (
    <div className="tg-scroller" style={{ flex: 'none' }}>
      <div className="tg-canvas" style={{ width }}>
        <div className="tg-body" style={{ height: rows * rowHeight }}>
          {children}
        </div>
      </div>
    </div>
  )
}
