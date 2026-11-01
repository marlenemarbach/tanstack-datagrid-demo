import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import Stack from '@mui/material/Stack'
import { Checkbox } from './cells'

const meta = {
  title: 'Grid/Checkbox',
  component: Checkbox,
  parameters: {
    docs: {
      description: {
        component:
          'Native tri-state checkbox, cheap enough for every row (styled globally via `.tg-checkbox` in the theme). ' +
          'Used for row, group and select-all selection and in the multi-select filter.',
      },
    },
  },
  args: { label: 'Select row', checked: false, indeterminate: false, onToggle: fn() },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Unchecked: Story = {}

export const Checked: Story = { args: { checked: true } }

export const Indeterminate: Story = { args: { indeterminate: true } }

export const AllStates: Story = {
  render: (args) => (
    <Stack direction="row" spacing={2}>
      <Checkbox {...args} label="Unchecked" checked={false} />
      <Checkbox {...args} label="Checked" checked />
      <Checkbox {...args} label="Indeterminate" checked={false} indeterminate />
    </Stack>
  ),
}

export const Interactive: Story = {
  render: function Render(args) {
    const [checked, setChecked] = useState(false)
    return (
      <Checkbox
        {...args}
        checked={checked}
        onToggle={(v) => {
          setChecked(v)
          args.onToggle(v)
        }}
      />
    )
  },
}
