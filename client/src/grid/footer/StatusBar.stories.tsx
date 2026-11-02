import type { Meta, StoryObj } from '@storybook/react-vite'
import Button from '@mui/material/Button'
import { GridStyles } from '../../stories/GridStyles'
import { StatusBar } from './StatusBar'

const meta = {
  title: 'Grid/Footer/StatusBar',
  component: StatusBar,
  decorators: [
    (Story) => (
      <GridStyles>
        <Story />
      </GridStyles>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: 'Counts below the grid: matching records, rows incl. groups (when grouped), loaded items, columns, selection, plus an actions slot.',
      },
    },
  },
  args: { totalRecords: 100_000, totalItems: 100_000, grouped: false, loaded: 400, columns: 66, renderedColumns: 9, selected: 0 },
} satisfies Meta<typeof StatusBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Grouped: Story = { args: { grouped: true, totalItems: 100_006 } }

export const WithSelection: Story = { args: { selected: 3_042 } }

export const WithActions: Story = {
  args: {
    actions: (
      <Button size="small" sx={{ ml: 'auto', alignSelf: 'center', height: 0 }}>
        Export
      </Button>
    ),
  },
}
