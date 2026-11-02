import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { EditModeToggle } from './EditModeToggle'

const meta = {
  title: 'Grid/Controls/EditModeToggle',
  component: EditModeToggle,
  parameters: {
    docs: { description: { component: 'Switch for the grid\'s `editMode` prop. The parent owns the state.' } },
  },
  args: { value: false, onChange: fn() },
} satisfies Meta<typeof EditModeToggle>

export default meta
type Story = StoryObj<typeof meta>

export const Off: Story = {}

export const On: Story = { args: { value: true } }

export const Interactive: Story = {
  render: function Render(args) {
    const [value, setValue] = useState(args.value)
    return (
      <EditModeToggle
        value={value}
        onChange={(v) => {
          setValue(v)
          args.onChange(v)
        }}
      />
    )
  },
}
