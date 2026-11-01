import { useCallback, useDeferredValue, useState } from 'react'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import FormControlLabel from '@mui/material/FormControlLabel'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { patchOrder, queryOrders, type Order } from './api/orders'
import { gridSx } from './App.styles'
import { groupableColumns, orderColumns, pinnedColumns } from './columns'
import { DataGrid } from './grid/DataGrid'
import { SearchField } from './SearchField'

const ordersKey = ['orders'] as const
const getOrderId = (order: Order) => order.order_id

export function App() {
  const [search, setSearch] = useState('')
  const [grouping, setGrouping] = useState<Array<{ id: string; label: string }>>([])
  const [editMode, setEditMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onGridError = useCallback((e: Error) => setError(e.message), [])
  const groupIds = useDeferredValue(grouping.map((g) => g.id).join(','))

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', gap: 2, p: 2, boxSizing: 'border-box', bgcolor: 'background.default' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
        <Typography variant="h6" sx={{ flex: 'none' }}>
          Orders
        </Typography>
        <SearchField onSearch={setSearch} />
        <Autocomplete
          multiple
          size="small"
          options={groupableColumns}
          value={grouping}
          onChange={(_, v) => setGrouping(v)}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={(params) => <TextField {...params} placeholder={grouping.length ? '' : 'Group by…'} />}
          sx={{ flex: 1, minWidth: 240 }}
        />
        <FormControlLabel control={<Switch checked={editMode} onChange={(e) => setEditMode(e.target.checked)} />} label="Edit mode" />
      </Stack>

      <DataGrid
        queryKey={ordersKey}
        columns={orderColumns}
        pinnedColumns={pinnedColumns}
        fetchPage={queryOrders}
        updateRecord={patchOrder}
        getRecordId={getOrderId}
        search={search}
        grouping={useGroupingArray(groupIds)}
        editMode={editMode}
        onError={onGridError}
        sx={gridSx}
      />

      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)} variant="filled">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  )
}

/** Stable array identity for the grid's `grouping` prop. */
const groupingCache = new Map<string, Array<string>>()
function useGroupingArray(ids: string) {
  let arr = groupingCache.get(ids)
  if (!arr) groupingCache.set(ids, (arr = ids ? ids.split(',') : []))
  return arr
}
