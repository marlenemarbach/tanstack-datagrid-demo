/**
 * Public API of the data grid. Code outside `grid/` imports only from here;
 * everything not exported is internal and may change.
 */

// Grid
export { DataGrid, type DataGridProps, type SelectionInfo } from './DataGrid'

// Columns
export { features, type ColumnType, type EditingCell, type Features, type GridColumnDef, type GridColumnMeta, type GridTableMeta, type OptionDef, type Tone } from './core/features'
export { formatValue, renderValue } from './cells/format'
/** The default cell renderer: formatted value, or the editor while the cell is edited. */
export { GridCell } from './cells/GridCell'
export { Checkbox } from './cells/Checkbox'

// Query protocol and data sources
export type { Filter, FilterValue, GroupItem, QueryItem, QueryRequest, QueryResponse, RecordItem } from './core/types'
export type { SelectionState } from './core/selection'
export { patchRecordInPages, type GridData, type GridDataArgs, type PageParam, type UseGridData } from './data/dataSource'
export { tanstackDataSource, type TanstackDataSourceOptions } from './data/tanstackDataSource'
export { gridInfiniteQueryOptions, rtkDataSource, type GridQueryArg, type RtkDataSourceOptions } from './data/rtkDataSource'

// Controls to place around the grid
export { EditModeToggle } from './controls/EditModeToggle'
export { GroupByField, type GroupByOption } from './controls/GroupByField'

// Icons and styles
export { Icon, IconSprite, iconNames, type IconName } from './icons/icons'
export { gridSx } from './styles/gridSx'
export { checkboxStyles } from './styles/checkboxStyles'
