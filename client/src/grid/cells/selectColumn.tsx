import type { GridColumnDef } from '../core/features'
import { recordIdOf } from '../core/rowId'
import { allCheckState, isRecordSelected } from '../core/selection'
import { Checkbox } from './Checkbox'

/** The checkbox column the grid puts first; reads and writes selection through table meta. */
export const selectColumn: GridColumnDef<unknown> = {
  id: 'select',
  size: 44,
  enableSorting: false,
  enableColumnFilter: false,
  enableResizing: false,
  // Always present, independent of edit mode, visibility or grouping.
  enableHiding: false,
  enableGrouping: false,
  header: ({ table }) => {
    const meta = table.options.meta!
    const { checked, indeterminate } = allCheckState(meta.selection)
    return <Checkbox label="Select all" checked={checked} indeterminate={indeterminate} onToggle={(v) => meta.select(null, v)} />
  },
  cell: ({ row, table }) => {
    const item = row.original
    if (item.kind !== 'RECORD') return null
    const meta = table.options.meta!
    const id = recordIdOf(row.id)
    return (
      <Checkbox
        label="Select row"
        checked={isRecordSelected(meta.selection, item.group_path, id)}
        onToggle={(v) => meta.select({ groupPath: item.group_path, id }, v)}
      />
    )
  },
}
