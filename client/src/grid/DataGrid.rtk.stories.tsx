import { useMemo, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import Box from '@mui/material/Box'
import { Provider } from 'react-redux'
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table'
import type { Order } from '../api/orders'
import { orderColumns } from '../columns'
import { createOrdersApi, type MockOptions } from '../stories/mockOrders'
import { createOrdersRtk } from '../stories/ordersRtk'
import { DataGrid, type DataGridProps } from './DataGrid'

type OrdersGridProps = MockOptions & Partial<Omit<DataGridProps<Order>, 'columns' | 'useData' | 'getRecordId'>>

const getOrderId = (order: Order) => order.order_id

/** The grid with its data from RTK Query instead of TanStack Query; a fresh store per mock configuration. */
function RtkOrdersGrid({ rows, latency, fail, hang, sorting: initialSorting, columnFilters: initialFilters, ...props }: OrdersGridProps) {
  const { store, useOrders } = useMemo(() => createOrdersRtk(createOrdersApi({ rows, latency, fail, hang })), [rows, latency, fail, hang])
  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? [])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(initialFilters ?? [])

  return (
    <Provider store={store}>
      <Box sx={{ height: 560, display: 'flex', flexDirection: 'column' }}>
        <DataGrid
          columns={orderColumns}
          useData={useOrders}
          getRecordId={getOrderId}
          sorting={sorting}
          onSortingChange={setSorting}
          columnFilters={columnFilters}
          onColumnFiltersChange={setColumnFilters}
          {...props}
        />
      </Box>
    </Provider>
  )
}

const meta = {
  title: 'Grid/DataGrid (RTK Query)',
  component: RtkOrdersGrid,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The same grid fed by RTK Query: an `infiniteQuery` endpoint for the pages and a mutation with an optimistic ' +
          '`onQueryStarted` for edits, adapted with `rtkDataSource`. See `src/stories/ordersRtk.ts` for the API definition.',
      },
    },
  },
  args: {
    rows: 5000,
    latency: 150,
    editMode: false,
    stripedRows: true,
    onSelectionChange: fn(),
    onError: fn(),
  },
  argTypes: {
    rows: { control: { type: 'number', min: 0, step: 1000 }, description: 'Mock: number of generated orders' },
    latency: { control: { type: 'range', min: 0, max: 2000, step: 50 }, description: 'Mock: response delay in ms' },
    fail: { control: 'text', description: 'Mock: every request fails with this message' },
    hang: { control: 'boolean', description: 'Mock: requests never resolve' },
    grouping: { control: 'object' },
    sorting: { control: 'object' },
    columnFilters: { control: 'object' },
    statusBarActions: { control: false },
    sx: { control: false },
  },
} satisfies Meta<typeof RtkOrdersGrid>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Grouped: Story = { args: { grouping: ['status', 'region'] } }

export const EditMode: Story = {
  args: { editMode: true },
  parameters: { docs: { description: { story: 'Edits go through the RTK mutation; the cached pages are patched optimistically.' } } },
}

// Not `Error`: that would shadow the global in this module.
export const RequestFailed: Story = { args: { fail: 'Service unavailable' } }
