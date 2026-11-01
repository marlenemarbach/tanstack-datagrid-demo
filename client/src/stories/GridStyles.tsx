import type { ReactNode } from 'react'
import Box from '@mui/material/Box'
import { gridSx } from '../App.styles'

/**
 * The grid's class-based styles live on its root (`.tg-root` + `gridSx`).
 * Grid parts shown on their own need the same ancestor to be styled.
 */
export function GridStyles({ children, inline }: { children: ReactNode; inline?: boolean }) {
  return (
    // Inline style: `gridSx` is a theme callback and cannot be merged in an sx array.
    <Box className="tg-root" sx={gridSx} style={{ padding: 16, gap: 12, flex: 'none', display: inline ? 'inline-flex' : undefined }}>
      {children}
    </Box>
  )
}
