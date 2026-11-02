import { useEffect, useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import type { ColumnFiltersState } from '@tanstack/react-table'
import { useDemoTable } from '../../stories/useDemoTable'
import { FilterPopover, type FilterTarget } from './FilterPopover'

function FilterPopoverDemo({ columnId, initialFilters }: { columnId: string; initialFilters?: ColumnFiltersState }) {
  const { table, columnFilters } = useDemoTable(initialFilters)
  const anchor = useRef<HTMLButtonElement>(null)
  const [target, setTarget] = useState<FilterTarget | null>(null)
  const column = table.getColumn(columnId)!
  const open = () => setTarget({ column, anchor: anchor.current! })
  // Open on mount, once the anchor exists.
  useEffect(open, [columnId])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, minHeight: 380 }}>
      <Button ref={anchor} variant="outlined" size="small" onClick={open} sx={{ width: 240, justifyContent: 'flex-start' }}>
        Filter {String(column.columnDef.header)}
      </Button>
      <Box component="pre" sx={{ m: 0, mt: 'auto', fontSize: 12, color: 'text.secondary' }}>
        {JSON.stringify(columnFilters, null, 2)}
      </Box>
      <FilterPopover target={target} onClose={() => setTarget(null)} />
    </Box>
  )
}

const meta = {
  title: 'Grid/Filters/FilterPopover',
  component: FilterPopoverDemo,
  parameters: {
    docs: {
      description: {
        component:
          'The grid has one filter popover, anchored to the header cell or filter-row field. The form depends on the column type; ' +
          'it edits the TanStack column filter, which already has the API filter shape (shown below). Text and range inputs apply after a 300 ms pause.',
      },
      story: { inline: false, iframeHeight: 420 },
    },
  },
  argTypes: { columnId: { control: 'text' } },
} satisfies Meta<typeof FilterPopoverDemo>

export default meta
type Story = StoryObj<typeof meta>

export const TextSearch: Story = { args: { columnId: 'customer_name' } }

export const NumberRange: Story = { args: { columnId: 'order_value' } }

export const DateRange: Story = { args: { columnId: 'delivery_date' } }

export const DateTimeRange: Story = { args: { columnId: 'created_at' } }

export const YesNo: Story = { args: { columnId: 'is_paid' } }

export const MultiSelect: Story = { args: { columnId: 'status' } }

export const MultiSelectWithIcons: Story = { args: { columnId: 'priority' } }

export const WithValue: Story = {
  args: {
    columnId: 'status',
    initialFilters: [{ id: 'status', value: { operator: 'IN', values: ['DELIVERED', 'CANCELLED'] } }],
  },
}

export const RangeWithValue: Story = {
  args: {
    columnId: 'created_at',
    initialFilters: [{ id: 'created_at', value: { operator: 'BETWEEN', from: '2025-03-01', to: '2025-03-31' } }],
  },
}
