import { useMemo } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { GridStyles, RowsFrame } from '../../stories/GridStyles'
import { sampleItems } from '../../stories/mockOrders'
import { useDemoTable } from '../../stories/useDemoTable'
import { GridCell } from '../cells/GridCell'
import { selectColumn } from '../cells/selectColumn'
import { emptySelection, isRecordSelected, setScope } from '../core/selection'
import { DataRow } from './DataRow'

interface DataRowDemoProps {
  rows: number
  columns: Array<string>
  /** Row indexes shown as selected. */
  selectedRows?: Array<number>
  editMode?: boolean
  striped?: boolean
  columnBorders?: boolean
  /** Order columns pinned after the selection column. */
  pinned?: Array<string>
}

const leading = [selectColumn]

/** Record rows rendered like the grid renders them (no virtualization: every column is in range). */
function DataRowDemo({ rows: count, columns, selectedRows = [], editMode, striped, columnBorders, pinned = [] }: DataRowDemoProps) {
  const items = useMemo(() => sampleItems({ limit: count }), [count])
  const selection = useMemo(
    () =>
      selectedRows.reduce((s, i) => {
        const item = items[i]
        return item?.kind === 'RECORD' ? setScope(s, { groupPath: item.group_path, id: item.record.order_id }, true) : s
      }, emptySelection),
    [items, selectedRows],
  )
  const { table } = useDemoTable([], {
    items,
    columnIds: columns,
    leadingColumns: leading,
    cell: GridCell,
    columnPinning: { start: ['select', ...pinned], end: [] },
    meta: { selection, editMode },
  })
  const rows = table.getRowModel().rows
  const startCount = table.getStartVisibleLeafColumns().length
  const centerCount = table.getCenterVisibleLeafColumns().length
  const navColumns = table.getVisibleLeafColumns()
  const width = table.getTotalSize()

  return (
    <GridStyles striped={striped} columnBorders={columnBorders} editMode={editMode}>
      <RowsFrame rows={rows.length} width={width}>
        {rows.map((row, index) => {
          const item = row.original
          return (
            <DataRow
              key={row.id}
              row={row}
              index={index}
              top={index * 36}
              width={width}
              startCount={startCount}
              colStart={0}
              colEnd={centerCount - 1}
              padLeft={0}
              padRight={0}
              selected={item.kind === 'RECORD' && isRecordSelected(selection, item.group_path, row.id.slice(1))}
              editingColumn={null}
              editMode={!!editMode}
              sizing={table.state.columnSizing}
              columns={navColumns}
            />
          )
        })}
      </RowsFrame>
    </GridStyles>
  )
}

const meta = {
  title: 'Grid/Body/DataRow',
  component: DataRowDemo,
  parameters: {
    docs: {
      description: {
        component:
          'A record row: start-pinned cells, a spacer for the columns scrolled out on the left, the center cells in range, and a spacer on the right. ' +
          'Memoised; scrolling vertically only renders rows that enter the viewport.',
      },
    },
  },
  args: { rows: 6, columns: ['order_id', 'customer_name', 'status', 'priority', 'order_value', 'is_paid', 'created_at'] },
} satisfies Meta<typeof DataRowDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Striped: Story = { args: { striped: true } }

export const Selected: Story = { args: { selectedRows: [1, 2] } }

export const EditMode: Story = {
  args: { editMode: true },
  parameters: { docs: { description: { story: 'Editable cells look like inputs; the editor itself only mounts for the edited cell.' } } },
}

export const PinnedColumns: Story = { args: { pinned: ['order_id'], columnBorders: true } }
