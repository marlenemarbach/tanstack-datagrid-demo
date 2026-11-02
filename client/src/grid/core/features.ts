import {
  columnFilteringFeature,
  columnGroupingFeature,
  columnOrderingFeature,
  columnPinningFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  metaHelper,
  rowExpandingFeature,
  rowSortingFeature,
  tableFeatures,
  type Column,
  type ColumnDef,
  type Header,
  type Row,
} from '@tanstack/react-table'
import type { IconName } from '../icons/icons'
import type { SelectionState } from './selection'
import type { QueryItem } from './types'

export type ColumnType = 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'enum' | 'status' | 'icon'
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'primary'

export interface OptionDef {
  value: string
  label: string
  icon?: IconName
  tone?: Tone
}

export interface GridColumnMeta {
  type?: ColumnType
  editable?: boolean
  options?: Array<OptionDef>
  /** Intl options for number/date columns. */
  format?: Intl.NumberFormatOptions | Intl.DateTimeFormatOptions
  /** Icon columns: render the label next to the icon. */
  showLabel?: boolean
  align?: 'start' | 'end' | 'center'
}

export interface EditingCell {
  rowId: string
  columnId: string
  /** Character that started the edit, `''` to clear, `undefined` to keep the value. */
  seed?: string
}

export interface GridTableMeta {
  editMode: boolean
  editing: EditingCell | null
  selection: SelectionState
  /** `null` scope = everything matching the current query. */
  select: (scope: { groupPath: string; id?: string } | null, value: boolean) => void
  stopEdit: (refocus: boolean) => void
  commit: (rowId: string, columnId: string, value: unknown) => void
}

/**
 * Every server-owned stage is registered for its state and APIs only; no
 * client row models are registered because the server does the processing.
 */
export const features = tableFeatures({
  columnVisibilityFeature,
  columnOrderingFeature,
  columnSizingFeature,
  columnResizingFeature,
  columnPinningFeature,
  rowSortingFeature,
  columnFilteringFeature,
  columnGroupingFeature,
  rowExpandingFeature,
  columnMeta: metaHelper<GridColumnMeta>(),
  tableMeta: metaHelper<GridTableMeta>(),
})

export type Features = typeof features
export type GridColumnDef<T> = ColumnDef<Features, QueryItem<T>, unknown>

// Untyped (record = unknown) aliases used inside the grid.
export type GridItem = QueryItem<unknown>
export type GridRow = Row<Features, GridItem>
export type GridColumn = Column<Features, GridItem, unknown>
export type GridHeader = Header<Features, GridItem, unknown>
export type GridCellObj = ReturnType<GridRow['getAllCells']>[number]
