import { memo, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'
import { createValueStore, GridModelContext, GridStatsContext, GridStatusContext } from './context'
import { DEFAULT_ROW_HEIGHT, useGridModel, type GridModelOptions } from './model/useGridModel'
import { gridSx } from './styles/gridSx'

export interface GridRootProps<T> extends GridModelOptions<T> {
  /** Vertical borders between header, filter and body cells (default true). */
  columnBorders?: boolean
  /** Light grey background on every second row (default false). */
  stripedRows?: boolean
  /** Added on top of the built-in styles (`gridSx`), which target class names, not individual cells. */
  sx?: SxProps<Theme>
  /**
   * The grid parts, e.g. `<DataGrid.Viewport />` and `<DataGrid.StatusBar />`.
   * Keep them stable (static JSX or memoised): new children re-render the whole grid.
   */
  children?: ReactNode
}

/**
 * Owns the grid's state and data and provides them to the parts inside.
 * The styled shell renders only when props change; state and data updates
 * stay inside <GridProvider>, so the (large) root `sx` is not re-serialised.
 */
export const GridRoot = memo(function GridRoot<T>(props: GridRootProps<T>) {
  return (
    <Box
      className="tg-root"
      // The built-in styles are one module-level object; a consumer `sx` is layered on top.
      sx={props.sx ? [gridSx, ...(Array.isArray(props.sx) ? props.sx : [props.sx])] : gridSx}
      data-edit-mode={props.editMode ? 'true' : undefined}
      data-column-borders={props.columnBorders !== false ? 'true' : undefined}
      data-striped-rows={props.stripedRows ? 'true' : undefined}
      style={{ '--row-height': `${props.rowHeight ?? DEFAULT_ROW_HEIGHT}px` } as CSSProperties}
    >
      <GridProvider {...(props as unknown as GridRootProps<unknown>)} />
    </Box>
  )
}) as <T>(props: GridRootProps<T>) => ReactElement

function GridProvider({ children, ...options }: GridRootProps<unknown>) {
  const { model, status } = useGridModel(options)
  const [stats] = useState(() => createValueStore(0))
  return (
    <GridModelContext value={model}>
      <GridStatusContext value={status}>
        <GridStatsContext value={stats}>{children}</GridStatsContext>
      </GridStatusContext>
    </GridModelContext>
  )
}
