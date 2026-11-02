import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import type { SortingState } from '@tanstack/react-table'
import { GridStyles } from '../../stories/GridStyles'
import { useDemoTable } from '../../stories/useDemoTable'
import { selectColumn } from '../cells/selectColumn'
import type { GridColumn } from '../core/features'
import { pinOffset } from '../core/pinning'
import { HeaderCell } from './HeaderCell'
import { useColumnReorder } from './useColumnReorder'

interface HeaderRowDemoProps {
  columns: Array<string>
  initialSorting?: SortingState
  /** Columns pinned to the start. */
  pinned?: Array<string>
  /** Show the header filter button (the grid does this when the filter row is hidden). */
  filterButton?: boolean
  /** Prepend the selection column (not sortable, select-all checkbox). */
  selectColumn?: boolean
  onFilter?: (column: GridColumn, anchor: HTMLElement) => void
}

const leading = [selectColumn]

/** A header row wired like the grid's: sorting, resizing and drag-to-reorder are live. */
function HeaderRowDemo({ columns, initialSorting, pinned = [], filterButton, selectColumn: withSelect, onFilter }: HeaderRowDemoProps) {
  const start = withSelect ? ['select', ...pinned] : pinned
  const { table } = useDemoTable([], { initialSorting, columnIds: columns, leadingColumns: withSelect ? leading : undefined, columnPinning: { start, end: [] } })
  const ids = table.getAllLeafColumns().map((c) => c.id)
  const { dragColumn, dropTarget, handlers } = useColumnReorder(ids, table.state.columnOrder, table.setColumnOrder)
  const lastPinned = table.getStartVisibleLeafColumns().at(-1)?.id
  const headers = [...table.getStartLeafHeaders(), ...table.getCenterLeafHeaders()]

  return (
    <GridStyles>
      <div className="tg-header" style={{ width: table.getTotalSize() }}>
        <div className="tg-header-row" role="row" style={{ height: 40 }} {...handlers}>
          {headers.map((header, ci) => (
            <HeaderCell
              key={header.id}
              header={header}
              ci={ci}
              sorted={header.column.getIsSorted()}
              sortIndex={header.column.getSortIndex()}
              multiSort={table.state.sorting.length > 1}
              size={header.getSize()}
              resizing={header.column.getIsResizing()}
              filtered={header.column.getIsFiltered()}
              isLastPinned={header.column.id === lastPinned}
              pinnedOffset={pinOffset(header.column)}
              selection={header.column.id === 'select' ? table.options.meta!.selection : undefined}
              dragging={dragColumn === header.column.id}
              dropSide={dropTarget?.id === header.column.id ? dropTarget.side : undefined}
              onFilter={filterButton ? onFilter : undefined}
            />
          ))}
        </div>
      </div>
    </GridStyles>
  )
}

const meta = {
  title: 'Grid/Header/HeaderCell',
  component: HeaderRowDemo,
  parameters: {
    docs: {
      description: {
        component:
          'One column header: sort button (shift-click adds a sort level), optional filter button, resize handle (double-click resets). ' +
          'Memoised; every piece of state it shows is passed as a prop. Column reordering is delegated to the header row (`useColumnReorder`): drag a header onto another.',
      },
    },
  },
  args: { columns: ['order_id', 'customer_name', 'status', 'order_value', 'created_at'], onFilter: fn() },
} satisfies Meta<typeof HeaderRowDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The first direction depends on the data (TanStack's auto sort direction); the second click reverses it.
    const header = canvas.getByRole('columnheader', { name: /Customer/ })
    await userEvent.click(within(header).getByRole('button'))
    const first = header.getAttribute('aria-sort')
    await expect(first).toMatch(/^(ascending|descending)$/)
    await userEvent.click(within(header).getByRole('button'))
    await expect(header).toHaveAttribute('aria-sort', first === 'ascending' ? 'descending' : 'ascending')
  },
}

export const Sorted: Story = { args: { initialSorting: [{ id: 'order_value', desc: true }] } }

export const MultiSort: Story = {
  args: {
    initialSorting: [
      { id: 'status', desc: false },
      { id: 'order_value', desc: true },
    ],
  },
  parameters: { docs: { description: { story: 'With more than one sort level each sorted header shows its position.' } } },
}

export const FilterButton: Story = {
  args: { filterButton: true },
  parameters: { docs: { description: { story: 'Shown when the filter row is hidden; opens the filter popover.' } } },
}

export const Pinned: Story = {
  args: { pinned: ['order_id'] },
  parameters: { docs: { description: { story: 'Pinned headers are sticky and cannot be dragged; the last one carries the pinned edge.' } } },
}

export const WithSelectColumn: Story = { args: { selectColumn: true } }
