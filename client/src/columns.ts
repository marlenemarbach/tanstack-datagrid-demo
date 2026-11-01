import type { Order, QueryItem } from './api/orders'
import type { GridColumnDef, GridColumnMeta, OptionDef } from './grid/features'

const opts = (values: Array<string>): Array<OptionDef> =>
  values.map((value) => ({ value, label: value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ') }))

const statusOptions: Array<OptionDef> = [
  { value: 'OPEN', label: 'Open', tone: 'neutral' },
  { value: 'PROCESSING', label: 'Processing', tone: 'info' },
  { value: 'SHIPPED', label: 'Shipped', tone: 'primary' },
  { value: 'DELIVERED', label: 'Delivered', tone: 'success' },
  { value: 'ON_HOLD', label: 'On hold', tone: 'warning' },
  { value: 'CANCELLED', label: 'Cancelled', tone: 'error' },
]

const priorityOptions: Array<OptionDef> = [
  { value: 'LOW', label: 'Low', icon: 'priority-low', tone: 'neutral' },
  { value: 'MEDIUM', label: 'Medium', icon: 'priority-medium', tone: 'info' },
  { value: 'HIGH', label: 'High', icon: 'priority-high', tone: 'warning' },
  { value: 'CRITICAL', label: 'Critical', icon: 'priority-critical', tone: 'error' },
]

const channelOptions: Array<OptionDef> = [
  { value: 'WEB', label: 'Web', icon: 'web' },
  { value: 'MOBILE', label: 'Mobile', icon: 'mobile' },
  { value: 'STORE', label: 'Store', icon: 'store' },
  { value: 'PHONE', label: 'Phone', icon: 'phone' },
  { value: 'PARTNER', label: 'Partner', icon: 'partner' },
]

const paymentOptions: Array<OptionDef> = [
  { value: 'CARD', label: 'Card', icon: 'card' },
  { value: 'PAYPAL', label: 'PayPal', icon: 'wallet' },
  { value: 'INVOICE', label: 'Invoice', icon: 'invoice' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer', icon: 'bank' },
]

function field(key: keyof Order & string, header: string, meta: GridColumnMeta = {}, size?: number): GridColumnDef<Order> {
  return {
    id: key,
    header,
    accessorFn: (item: QueryItem<Order>) => (item.kind === 'RECORD' ? item.record[key] : undefined),
    size,
    meta: { type: 'text', editable: true, ...meta },
  }
}

const decimal = { minimumFractionDigits: 2, maximumFractionDigits: 2 }

const kpiColumns = Array.from({ length: 40 }, (_, i) => {
  const key = `kpi_${String(i + 1).padStart(2, '0')}` as const
  return field(key, `KPI ${i + 1}`, { type: 'number', format: decimal }, 110)
})

export const orderColumns: Array<GridColumnDef<Order>> = [
  field('order_id', 'Order', { editable: false }, 130),
  field('customer_name', 'Customer', {}, 180),
  field('status', 'Status', { type: 'status', options: statusOptions }, 130),
  field('priority', 'Priority', { type: 'icon', options: priorityOptions, align: 'center' }, 90),
  field('channel', 'Channel', { type: 'icon', options: channelOptions, showLabel: true }, 130),
  field('payment_method', 'Payment', { type: 'icon', options: paymentOptions, align: 'center' }, 100),
  field('is_paid', 'Paid', { type: 'boolean', align: 'center' }, 80),
  field('is_express', 'Express', { type: 'boolean', align: 'center' }, 90),
  field('is_gift', 'Gift', { type: 'boolean', align: 'center' }, 80),
  field('created_at', 'Created', { type: 'datetime', editable: false }, 180),
  field('delivery_date', 'Delivery', { type: 'date' }, 140),
  field('order_value', 'Value', { type: 'number', format: decimal }, 120),
  field('currency', 'Currency', { type: 'enum', options: opts(['EUR', 'USD', 'GBP']) }, 100),
  field('quantity', 'Qty', { type: 'number' }, 80),
  field('discount_rate', 'Discount', { type: 'number', format: { style: 'percent' } }, 100),
  field('rating', 'Rating', { type: 'number' }, 80),
  field('email', 'Email', {}, 240),
  field('company', 'Company'),
  field('city', 'City', {}, 130),
  field('country', 'Country', {}, 90),
  field('region', 'Region', { type: 'enum', options: opts(['EMEA', 'AMER', 'APAC']).map((o) => ({ ...o, label: o.value })) }, 100),
  field('category', 'Category', { type: 'enum', options: opts(['Shoes', 'Apparel', 'Accessories', 'Sports', 'Beauty', 'Home', 'Kids', 'Outdoor']) }),
  field('warehouse', 'Warehouse', {
    type: 'enum',
    options: opts(['WH-ERFURT', 'WH-MOENCHENGLADBACH', 'WH-LAHR', 'WH-GRYFINO', 'WH-OLSZTYNEK']).map((o) => ({ ...o, label: o.value })),
  }, 200),
  field('sales_rep', 'Sales rep', {}, 170),
  field('notes', 'Notes', {}, 220),
  ...kpiColumns,
]

export const pinnedColumns = ['order_id']

export const groupableColumns = [
  'status', 'priority', 'channel', 'payment_method', 'is_paid', 'is_express', 'currency', 'region', 'country', 'city', 'category', 'warehouse', 'sales_rep',
].map((id) => ({ id, label: orderColumns.find((c) => c.id === id)!.header as string }))
