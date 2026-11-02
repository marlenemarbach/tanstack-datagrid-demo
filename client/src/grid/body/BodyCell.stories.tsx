import { useMemo } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { GridStyles, RowsFrame } from '../../stories/GridStyles'
import { sampleItems } from '../../stories/mockOrders'
import { useDemoTable } from '../../stories/useDemoTable'
import { GridCell } from '../cells/GridCell'
import { pinOffset } from '../core/pinning'
import { BodyCell } from './BodyCell'

interface BodyCellDemoProps {
  columnId: string
  editMode?: boolean
  /** Mount the editor in the cell. */
  editing?: boolean
  pinned?: boolean
  width?: number
}

/** One cell in a row of its own, so its row background and borders show. */
function BodyCellDemo({ columnId, editMode, editing, pinned, width = 180 }: BodyCellDemoProps) {
  const items = useMemo(() => sampleItems({ limit: 1 }), [])
  const rowId = items[0]?.kind === 'RECORD' ? `#${items[0].record.order_id}` : ''
  const { table } = useDemoTable([], {
    items,
    columnIds: [columnId],
    cell: GridCell,
    columnPinning: { start: pinned ? [columnId] : [], end: [] },
    meta: { editMode, editing: editing ? { rowId, columnId } : null },
  })
  const cell = table.getRowModel().rows[0]?.getAllCells()[0]
  if (!cell) return null

  return (
    <GridStyles editMode={editMode} inline>
      <RowsFrame rows={1} width={width}>
        <div className="tg-row" role="row" data-row={0} style={{ width }}>
          <BodyCell
            cell={cell}
            ci={0}
            isLastPinned={!!pinned}
            pinnedOffset={pinOffset(cell.column)}
            width={width}
            editMode={!!editMode}
            editing={!!editing}
            selected={false}
          />
        </div>
      </RowsFrame>
    </GridStyles>
  )
}

const meta = {
  title: 'Grid/Body/BodyCell',
  component: BodyCellDemo,
  parameters: {
    docs: {
      description: {
        component:
          'The cell wrapper: width, pinning, alignment and the `data-*` attributes the styles key on. ' +
          'Its content comes from the column\'s `cell` (default `GridCell`). Memoised; horizontal scrolling only renders cells that enter the viewport.',
      },
    },
  },
  args: { columnId: 'customer_name' },
  argTypes: {
    columnId: { control: 'select', options: ['customer_name', 'order_value', 'status', 'priority', 'is_paid', 'delivery_date', 'created_at'] },
  },
} satisfies Meta<typeof BodyCellDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Text: Story = {}

export const NumberValue: Story = { args: { columnId: 'order_value' } }

export const Status: Story = { args: { columnId: 'status' } }

export const Editable: Story = {
  args: { editMode: true },
  parameters: { docs: { description: { story: 'In edit mode, editable cells look like inputs.' } } },
}

export const Editing: Story = { args: { editMode: true, editing: true } }

export const Pinned: Story = {
  args: { pinned: true },
  parameters: { docs: { description: { story: 'Sticky, with the shadow edge of the last pinned column.' } } },
}
