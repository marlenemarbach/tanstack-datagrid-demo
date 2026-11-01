import { useState } from 'react'
import { useTable, type ColumnFiltersState } from '@tanstack/react-table'
import type { QueryItem } from '../api/orders'
import { orderColumns } from '../columns'
import { features } from '../grid/features'

const noRows: Array<QueryItem<unknown>> = []
const serverSideFilter = () => true

/**
 * A data-less table over the order columns, so filter components get real
 * TanStack columns with live filter state.
 */
export function useDemoTable(initialFilters: ColumnFiltersState = []) {
  const [columnFilters, setColumnFilters] = useState(initialFilters)
  const table = useTable({
    features,
    columns: orderColumns as never,
    data: noRows,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    manualFiltering: true,
    defaultColumn: { filterFn: serverSideFilter },
  })
  return { table, columnFilters }
}
