import { useCallback, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import Box from '@mui/material/Box'
import type { ColumnFiltersState } from '@tanstack/react-table'
import type { FilterValue } from '../core/types'
import { GridStyles } from '../../stories/GridStyles'
import { useDemoTable } from '../../stories/useDemoTable'
import { FilterPopover, type FilterTarget } from './FilterPopover'
import { FilterCell } from './FilterCell'

/** One example column per filter kind. */
const allColumns = ['customer_name', 'order_value', 'delivery_date', 'created_at', 'is_paid', 'status', 'priority', 'currency']

function FilterRowDemo({ columns, initialFilters }: { columns: Array<string>; initialFilters?: ColumnFiltersState }) {
  const { table, columnFilters } = useDemoTable(initialFilters)
  const [target, setTarget] = useState<FilterTarget | null>(null)
  const onOpen = useCallback((column: FilterTarget['column'], anchor: HTMLElement) => setTarget({ column, anchor }), [])

  return (
    <GridStyles>
      <div className="tg-header">
        <div className="tg-header-row" role="row" style={{ height: 40 }}>
          {columns.map((id) => (
            <div key={id} className="tg-th" style={{ width: 140 }}>
              <div className="tg-th-label">
                <span className="tg-th-text">{String(table.getColumn(id)!.columnDef.header)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="tg-filter-row" role="row" style={{ height: 36 }}>
          {columns.map((id) => {
            const column = table.getColumn(id)!
            return (
              <FilterCell
                key={id}
                column={column}
                value={column.getFilterValue() as FilterValue | undefined}
                width={140}
                pinnedOffset={undefined}
                isLastPinned={false}
                onOpen={onOpen}
              />
            )
          })}
        </div>
      </div>
      <Box component="pre" sx={{ m: 0, fontSize: 12, color: 'text.secondary' }} data-testid="filter-state">
        {JSON.stringify(columnFilters, null, 2)}
      </Box>
      {target && <FilterPopover target={target} onClose={() => setTarget(null)} />}
    </GridStyles>
  )
}

const meta = {
  title: 'Grid/Filters/FilterCell',
  component: FilterRowDemo,
  parameters: {
    docs: {
      description: {
        component:
          '`FilterCell`: the per-column search field under the grid header. Text columns search "contains". ' +
          'Number and date columns take expressions: `42`, `>10`, `<10`, `10..20`, `2025`, `2025-03`; the button opens From/To fields. ' +
          'Boolean columns use a native select, enum/status/icon columns a checkbox list. The resulting TanStack filter state is shown below.',
      },
    },
  },
  args: { columns: allColumns },
} satisfies Meta<typeof FilterRowDemo>

export default meta
type Story = StoryObj<typeof meta>

export const AllTypes: Story = {}

export const WithValues: Story = {
  args: {
    initialFilters: [
      { id: 'customer_name', value: { operator: 'CONTAINS', value: 'anna' } },
      { id: 'order_value', value: { operator: 'BETWEEN', from: 10, to: 20 } },
      { id: 'delivery_date', value: { operator: 'BETWEEN', from: '2025-03-01', to: '2025-03-31' } },
      { id: 'is_paid', value: { operator: 'EQUALS', value: true } },
      { id: 'status', value: { operator: 'IN', values: ['OPEN', 'SHIPPED'] } },
      { id: 'priority', value: { operator: 'IN', values: ['HIGH'] } },
    ],
  },
}

export const NumberExpression: Story = {
  args: { columns: ['order_value'] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Filter Value'), '>500')
    // The filter is pushed after a 300 ms pause in typing.
    await expect(await canvas.findByText(/"from": 500/, {}, { timeout: 2000 })).toBeInTheDocument()
  },
}

export const InvalidExpression: Story = {
  args: { columns: ['order_value', 'delivery_date'] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText('Filter Value'), '>abc')
    await userEvent.type(canvas.getByLabelText('Filter Delivery'), '2025-13')
    await expect(canvas.getByLabelText('Filter Value')).toHaveAttribute('aria-invalid', 'true')
    await expect(canvas.getByLabelText('Filter Delivery')).toHaveAttribute('aria-invalid', 'true')
  },
}
