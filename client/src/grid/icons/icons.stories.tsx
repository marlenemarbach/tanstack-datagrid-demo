import type { Meta, StoryObj } from '@storybook/react-vite'
import Box from '@mui/material/Box'
import { Icon, iconNames } from './icons'

const meta = {
  title: 'Grid/Icons/Icon',
  component: Icon,
  parameters: {
    docs: {
      description: {
        component:
          'Icons come from one SVG sprite (`<IconSprite />`, mounted once at the app root); `<Icon>` only renders `<svg><use href="#…"/></svg>`. ' +
          'Size and colour come from the `.tg-icon` class of the surrounding styles.',
      },
    },
  },
  args: { name: 'save' },
  argTypes: { name: { control: 'select', options: iconNames } },
  decorators: [
    (Story) => (
      <Box sx={{ '& .tg-icon': { width: 24, height: 24, fill: 'currentColor' } }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof Icon>

export default meta
type Story = StoryObj<typeof meta>

export const Single: Story = {}

export const WithTitle: Story = {
  args: { name: 'check', title: 'Paid' },
  parameters: { docs: { description: { story: 'With `title` the icon is exposed to assistive technology as an image; without it, it is hidden.' } } },
}

export const Gallery: Story = {
  render: () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 2 }}>
      {iconNames.map((name) => (
        <Box key={name} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, fontSize: 12, color: 'text.secondary' }}>
          <Box sx={{ color: 'text.primary' }}>
            <Icon name={name} />
          </Box>
          {name}
        </Box>
      ))}
    </Box>
  ),
}
