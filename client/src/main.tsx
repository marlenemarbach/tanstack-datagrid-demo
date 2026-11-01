import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import CssBaseline from '@mui/material/CssBaseline'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import { IconSprite } from './grid/icons'

const queryClient = new QueryClient({
  defaultOptions: {
    // Refetching an infinite query refetches every loaded page; keep that explicit.
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
})

const theme = createTheme({ colorSchemes: { light: true, dark: true } })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <IconSprite />
        <App />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
