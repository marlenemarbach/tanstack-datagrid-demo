import { memo, useEffect, useState } from 'react'
import TextField from '@mui/material/TextField'

/**
 * Owns the draft text and the debounce. Keystrokes only re-render this field;
 * the parent (toolbar + grid) re-renders once the debounced value changes.
 */
export const SearchField = memo(function SearchField({ onSearch, delay = 250 }: { onSearch: (value: string) => void; delay?: number }) {
  const [draft, setDraft] = useState('')

  useEffect(() => {
    const t = setTimeout(() => onSearch(draft.trim()), delay)
    return () => clearTimeout(t)
  }, [draft, delay, onSearch])

  return <TextField size="small" type="search" placeholder="Fuzzy search…" value={draft} onChange={(e) => setDraft(e.target.value)} sx={{ width: { md: 280 } }} />
})
