import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { groupableColumns } from '../../columns'
import { GroupByField, type GroupByOption } from './GroupByField'

const byId = (ids: Array<string>) => ids.map((id) => groupableColumns.find((c) => c.id === id)!)

/** Owns the grouping like the app does, so chips can be added, removed and dragged. */
function GroupByFieldDemo({ initial, options, onChange }: { initial: Array<string>; options: Array<GroupByOption>; onChange: (ids: Array<string>) => void }) {
  const [value, setValue] = useState(() => byId(initial))
  return (
    <GroupByField
      options={options}
      value={value}
      onChange={(ids) => {
        setValue(byId(ids))
        onChange(ids)
      }}
    />
  )
}

const meta = {
  title: 'Grid/Controls/GroupByField',
  component: GroupByFieldDemo,
  parameters: {
    docs: {
      description: {
        component:
          'Multi-select of group-by columns for the grid\'s `grouping` prop. The chip order is the nesting order; drag a chip to change it.',
      },
    },
  },
  args: { initial: [], options: groupableColumns, onChange: fn() },
  argTypes: { options: { control: false } },
} satisfies Meta<typeof GroupByFieldDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {}

export const OneLevel: Story = { args: { initial: ['status'] } }

export const Nested: Story = { args: { initial: ['status', 'region', 'channel'] } }
