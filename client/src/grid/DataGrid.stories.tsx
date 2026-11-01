import { useMemo, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import type { ColumnFiltersState, ColumnOrderState, SortingState } from '@tanstack/react-table'
import type { Order } from '../api/orders'
import { gridSx } from '../App.styles'
import { orderColumns } from '../columns'
import { createOrdersApi, type MockOptions } from '../stories/mockOrders'
import { DataGrid, type DataGridProps } from './DataGrid'

type GridProps = DataGridProps<Order>
type OrdersGridProps = MockOptions &
  Partial<Omit<GridProps, 'queryKey' | 'columns' | 'fetchPage' | 'updateRecord' | 'getRecordId'>> & {
    /** Seeds the grid's sorting / filters / column order; the story then owns them like the app does. */
    sorting?: SortingState
    columnFilters?: ColumnFiltersState
    columnOrder?: ColumnOrderState
  }

const getOrderId = (order: Order) => order.order_id

/** The grid wired like the app: controlled sorting, filters and column order, data from an in-browser mock API. */
function OrdersGrid({ rows, latency, fail, hang, sorting: initialSorting, columnFilters: initialFilters, columnOrder: initialOrder, ...props }: OrdersGridProps) {
  const api = useMemo(() => createOrdersApi({ rows, latency, fail, hang }), [rows, latency, fail, hang])
  const queryKey = useMemo(() => ['orders', rows, latency, fail, hang], [rows, latency, fail, hang])
  const [sorting, setSorting] = useState(initialSorting ?? [])
  const [columnFilters, setColumnFilters] = useState(initialFilters ?? [])
  const [columnOrder, setColumnOrder] = useState(initialOrder ?? [])

  return (
    <Box sx={{ height: 560, display: 'flex', flexDirection: 'column' }}>
      <DataGrid
        queryKey={queryKey}
        columns={orderColumns}
        fetchPage={api.fetchPage}
        updateRecord={api.updateRecord}
        getRecordId={getOrderId}
        sorting={sorting}
        onSortingChange={setSorting}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        columnOrder={columnOrder}
        onColumnOrderChange={setColumnOrder}
        sx={gridSx}
        {...props}
      />
    </Box>
  )
}

const meta = {
  title: 'Grid/DataGrid',
  component: OrdersGrid,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Server-driven grid: sorting, filtering, grouping and paging run in the (mock) API. ' +
          'Rows and columns are virtualized. Click a header to sort (shift-click for multi-sort), drag headers to reorder, ' +
          'use the filter row or the header filter icon to filter. Data comes from the real server `QueryEngine` running in the browser.',
      },
    },
  },
  args: {
    rows: 5000,
    latency: 150,
    editMode: false,
    columnBorders: false,
    stripedRows: true,
    filterRow: true,
    rowHeight: 36,
    onSelectionChange: fn(),
    onError: fn(),
  },
  argTypes: {
    rows: { control: { type: 'number', min: 0, step: 1000 }, description: 'Mock: number of generated orders' },
    latency: { control: { type: 'range', min: 0, max: 2000, step: 50 }, description: 'Mock: response delay in ms' },
    fail: { control: 'text', description: 'Mock: every request fails with this message' },
    hang: { control: 'boolean', description: 'Mock: requests never resolve' },
    rowHeight: { control: 'inline-radio', options: [28, 36, 44] },
    pageSize: { control: { type: 'number', min: 10, step: 50 } },
    grouping: { control: 'object' },
    pinnedColumns: { control: 'object' },
    sorting: { control: 'object' },
    columnFilters: { control: 'object' },
    columnOrder: { control: 'object' },
    statusBarActions: { control: false },
    sx: { control: false },
  },
} satisfies Meta<typeof OrdersGrid>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Grouped: Story = {
  args: { grouping: ['status', 'region'] },
  parameters: { docs: { description: { story: 'Server-side multi-level grouping. Expand groups with the chevron or ←/→; group checkboxes select every record in the group, loaded or not.' } } },
}

export const SortedAndFiltered: Story = {
  args: {
    sorting: [{ id: 'order_value', desc: true }],
    columnFilters: [
      { id: 'status', value: { operator: 'IN', values: ['OPEN', 'ON_HOLD'] } },
      { id: 'order_value', value: { operator: 'BETWEEN', from: 500 } },
    ],
  },
}

export const ReorderedColumns: Story = {
  args: { columnOrder: ['status', 'customer_name', 'order_value', 'order_id'] },
}

export const EditMode: Story = {
  args: { editMode: true },
  parameters: { docs: { description: { story: 'Editable cells look like inputs. Type, press Enter/F2 or double-click to edit; Enter commits, Esc cancels. Booleans toggle on click/Space.' } } },
}

export const PinnedColumns: Story = {
  args: { pinnedColumns: ['order_id', 'customer_name'], columnBorders: true },
}

export const CompactRows: Story = { args: { rowHeight: 28 } }

export const LargeRows: Story = { args: { rowHeight: 44 } }

export const Plain: Story = {
  args: { filterRow: false, stripedRows: false, columnBorders: false },
  parameters: { docs: { description: { story: 'No filter row (filter from the header icon), no stripes, no column borders.' } } },
}

export const WithBordersAndStripes: Story = { args: { columnBorders: true, stripedRows: true } }

export const StatusBarActions: Story = {
  args: {
    statusBarActions: (
      <Button size="small" sx={{ ml: 'auto', alignSelf: 'center', height: 0 }}>
        Export
      </Button>
    ),
  },
}

export const Empty: Story = {
  args: { columnFilters: [{ id: 'customer_name', value: { operator: 'CONTAINS', value: 'no such customer' } }] },
}

export const NoData: Story = { args: { rows: 0 } }

export const Loading: Story = { args: { hang: true } }

// Not `Error`: that would shadow the global in this module.
export const RequestFailed: Story = { args: { fail: 'Service unavailable' } }

export const SlowNetwork: Story = { args: { latency: 1500 } }

export const LargeDataset: Story = {
  args: { rows: 100_000 },
  parameters: { docs: { description: { story: 'Same size as the dev server. Generating the data takes a moment on first load.' } } },
}
