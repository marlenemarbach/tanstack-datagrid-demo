import { useMemo, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { GridStyles, RowsFrame } from '../../stories/GridStyles'
import { sampleItems } from '../../stories/mockOrders'
import { useDemoTable } from '../../stories/useDemoTable'
import { BodyCell } from '../body/BodyCell'
import { GridCell } from './GridCell'

interface GridCellDemoProps {
  columnId: string
  /** Start with the editor open. */
  editing?: boolean
  onCommit?: (columnId: string, value: unknown) => void
}

/**
 * The default cell in a single cell. Click it to edit; Enter or Tab commits,
 * Escape cancels. Committed values show in the Actions panel.
 */
function GridCellDemo({ columnId, editing: startEditing, onCommit }: GridCellDemoProps) {
  const items = useMemo(() => sampleItems({ limit: 1 }), [])
  const rowId = items[0]?.kind === 'RECORD' ? `#${items[0].record.order_id}` : ''
  const [editing, setEditing] = useState(!!startEditing)
  const [value, setValue] = useState<unknown>(undefined)
  const shown = useMemo(
    () => (value === undefined || items[0]?.kind !== 'RECORD' ? items : [{ ...items[0], record: { ...items[0].record, [columnId]: value } }]),
    [items, value, columnId],
  )
  const { table } = useDemoTable([], {
    items: shown,
    columnIds: [columnId],
    cell: GridCell,
    meta: {
      editMode: true,
      editing: editing ? { rowId, columnId } : null,
      stopEdit: () => setEditing(false),
      commit: (_rowId, column, v) => {
        setValue(v)
        onCommit?.(column, v)
      },
    },
  })
  const cell = table.getRowModel().rows[0]?.getAllCells()[0]
  if (!cell) return null

  return (
    <GridStyles editMode inline>
      <RowsFrame rows={1} width={200}>
        <div className="tg-row" role="row" data-row={0} style={{ width: 200 }} onClick={() => setEditing(true)}>
          <BodyCell cell={cell} ci={0} isLastPinned={false} pinnedOffset={undefined} width={200} editMode editing={editing} selected={false} />
        </div>
      </RowsFrame>
    </GridStyles>
  )
}

const meta = {
  title: 'Grid/Cells/GridCell',
  component: GridCellDemo,
  parameters: {
    docs: {
      description: {
        component:
          'The default cell renderer. It shows the formatted value and only mounts an editor (native input or select) for the cell being edited. ' +
          'Booleans have no editor: the grid toggles them on click or Space.',
      },
    },
  },
  args: { columnId: 'customer_name', onCommit: fn() },
  argTypes: {
    columnId: { control: 'select', options: ['customer_name', 'order_value', 'quantity', 'delivery_date', 'status', 'priority', 'category'] },
  },
} satisfies Meta<typeof GridCellDemo>

export default meta
type Story = StoryObj<typeof meta>

export const TextEditor: Story = { args: { editing: true } }

export const NumberEditor: Story = { args: { columnId: 'order_value', editing: true } }

export const DateEditor: Story = { args: { columnId: 'delivery_date', editing: true } }

export const SelectEditor: Story = { args: { columnId: 'status', editing: true } }

export const Display: Story = { args: { columnId: 'priority' } }
