import type { Meta, StoryObj } from '@storybook/react-vite'
import { orderColumns } from '../../columns'
import { GridStyles } from '../../stories/GridStyles'
import { renderValue } from './format'
import type { GridColumnMeta } from '../core/features'

const metaOf = (id: string) => orderColumns.find((c) => c.id === id)!.meta as GridColumnMeta

/** Every value of an option column, or the given sample values. */
function ValueList({ columnId, values }: { columnId: string; values?: Array<unknown> }) {
  const meta = metaOf(columnId)
  const samples = values ?? meta.options?.map((o) => o.value) ?? []
  return (
    <GridStyles inline>
      {samples.map((value, i) => (
        <div key={i} className="tg-row" style={{ position: 'static', width: 360 }}>
          <div className="tg-cell" style={{ width: 160, color: 'GrayText' }}>
            {JSON.stringify(value)}
          </div>
          <div className="tg-cell" data-align={meta.align} style={{ width: 200 }}>
            {renderValue(meta, value)}
          </div>
        </div>
      ))}
    </GridStyles>
  )
}

const meta = {
  title: 'Grid/Cells/Values',
  component: ValueList,
  parameters: {
    docs: {
      description: {
        component:
          '`renderValue(meta, value)`: the read-only presentation of a cell, also used in group rows. ' +
          'The column `meta.type` picks the renderer; number and date columns format with cached `Intl` formatters and `meta.format`. ' +
          'Left: raw API value, right: rendered cell.',
      },
    },
  },
  argTypes: { columnId: { control: 'select', options: orderColumns.map((c) => c.id) } },
} satisfies Meta<typeof ValueList>

export default meta
type Story = StoryObj<typeof meta>

export const Status: Story = { args: { columnId: 'status' } }

export const IconOnly: Story = { args: { columnId: 'priority' } }

export const IconWithLabel: Story = { args: { columnId: 'channel' } }

export const PaymentIcons: Story = { args: { columnId: 'payment_method' } }

export const Enum: Story = { args: { columnId: 'category' } }

export const YesNo: Story = { args: { columnId: 'is_paid', values: [true, false] } }

export const Decimal: Story = { args: { columnId: 'order_value', values: [0, 9.5, 1234.567, -42] } }

export const Percent: Story = { args: { columnId: 'discount_rate', values: [0, 0.05, 0.125, 1] } }

export const Integer: Story = { args: { columnId: 'quantity', values: [1, 12, 12000] } }

export const DateOnly: Story = { args: { columnId: 'delivery_date', values: ['2025-03-14', '2026-12-31'] } }

export const DateTime: Story = { args: { columnId: 'created_at', values: ['2025-03-14T10:30:00Z', '2026-01-01T23:59:00Z'] } }

export const TextValue: Story = { args: { columnId: 'customer_name', values: ['Anna Schmidt', 'A very long customer name that is cut off with an ellipsis', ''] } }
