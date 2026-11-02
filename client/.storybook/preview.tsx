import { useEffect, useState, type ReactNode } from 'react'
import type { Decorator, Preview } from '@storybook/react-vite'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider, useColorScheme } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { IconSprite } from '../src/grid'
import { theme } from '../src/theme'

type Mode = 'light' | 'dark'

/** Follows the toolbar's theme switch; ThemeToggle can still change it inside a story. */
function ColorScheme({ mode }: { mode: Mode }) {
  const { setMode } = useColorScheme()
  useEffect(() => setMode(mode), [mode, setMode])
  return null
}

/** A fresh query cache per story, so mocks with different data never share results. */
function StoryQueryClient({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: false } } }),
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const withProviders: Decorator = (Story, context) => (
  <StoryQueryClient key={context.id}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ColorScheme mode={context.globals.theme as Mode} />
      <IconSprite />
      <Story />
    </ThemeProvider>
  </StoryQueryClient>
)

const preview: Preview = {
  decorators: [withProviders],
  globalTypes: {
    theme: {
      description: 'Colour scheme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  parameters: {
    controls: { matchers: { date: /Date$/i } },
  },
  tags: ['autodocs'],
}

export default preview
