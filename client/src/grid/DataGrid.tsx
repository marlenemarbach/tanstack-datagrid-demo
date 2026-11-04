import { memo, type ReactElement, type ReactNode } from 'react'
import { GridStatusBar } from './footer/GridStatusBar'
import { GridRoot, type GridRootProps } from './GridRoot'
import { GridViewport } from './GridViewport'

export type { SelectionInfo } from './model/useGridModel'

export interface DataGridProps<T> extends Omit<GridRootProps<T>, 'children'> {
  /** One search field per column below the header (default true). */
  filterRow?: boolean
  /** Extra controls at the right end of the status bar. */
  statusBarActions?: ReactNode
}

/**
 * The grid with its default parts. Memoised on flat props, so a parent
 * re-render with unchanged props costs nothing.
 *
 * For a different layout, compose the parts yourself:
 *
 * ```tsx
 * <DataGrid.Root columns={…} useData={…} getRecordId={…}>
 *   <DataGrid.Viewport filterRow={false} />
 *   <DataGrid.StatusBar><MyActions /></DataGrid.StatusBar>
 * </DataGrid.Root>
 * ```
 */
const DataGridPreset = memo(function DataGrid<T>({ filterRow, statusBarActions, ...props }: DataGridProps<T>) {
  return (
    <GridRoot {...props}>
      <GridViewport filterRow={filterRow} />
      <GridStatusBar>{statusBarActions}</GridStatusBar>
    </GridRoot>
  )
}) as <T>(props: DataGridProps<T>) => ReactElement

export const DataGrid = Object.assign(DataGridPreset, {
  /** Owns state and data; renders the styled shell. */
  Root: GridRoot,
  /** Header, filter row and virtualized body. */
  Viewport: GridViewport,
  /** Counts below the grid; children are extra controls at its right end. */
  StatusBar: GridStatusBar,
})
