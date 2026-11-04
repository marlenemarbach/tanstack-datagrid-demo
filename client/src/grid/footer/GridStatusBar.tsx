import type { ReactNode } from 'react'
import { useGridStatus, useRenderedColumnCount } from '../context'
import { StatusBar } from './StatusBar'

/**
 * `StatusBar` fed by the surrounding `DataGrid.Root`. Re-renders only when a
 * count changes, never on vertical scroll. Children go to the right end.
 */
export function GridStatusBar({ children }: { children?: ReactNode }) {
  const status = useGridStatus()
  const renderedColumns = useRenderedColumnCount()
  return <StatusBar {...status} renderedColumns={renderedColumns} actions={children} />
}
