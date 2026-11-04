import { useCallback, useMemo, useState } from 'react'
import type { QueryItem } from '../core/types'
import type { UseGridData } from '../data/dataSource'
import { toQueryRequest, type GridQueryState } from './toQueryRequest'

/** Largest first page requested after an expand/collapse. */
const MAX_RELOAD = 5000
const EMPTY: Array<never> = []

export interface GridQueryOptions<T> {
  useData: UseGridData<T>
  getRecordId: (record: T) => string
  query: GridQueryState
  pageSize: number
  /** Changes when the result set starts over (see `useGridState`); drops the reload size. */
  resultKey: string
  onError?: (error: Error) => void
}

/**
 * Server state of the grid: builds the request, calls the data source and
 * derives what the view needs (items, totals, group sizes). No rendering.
 */
export function useGridQuery<T>({ useData, getRecordId, query, pageSize, resultKey, onError }: GridQueryOptions<T>) {
  const { columnFilters, sorting, grouping, expanded } = query
  const request = useMemo(
    () => toQueryRequest({ columnFilters, sorting, grouping, expanded }),
    [columnFilters, sorting, grouping, expanded],
  )

  // How many items to request again after an expand/collapse, so the scroll position survives.
  // Keyed by `resultKey`: once the result set starts over, it is 0 again without an extra render.
  const [reload, setReload] = useState({ key: resultKey, size: 0 })
  const reloadSize = reload.key === resultKey ? reload.size : 0

  const data = useData({
    request,
    initialLimit: Math.min(MAX_RELOAD, Math.max(pageSize, reloadSize)),
    pageSize,
    getRecordId,
  })

  const items: Array<QueryItem<T>> = useMemo(() => data.pages?.flatMap((p) => p.items) ?? EMPTY, [data.pages])
  const lastPage = data.pages?.at(-1)

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) if (item.kind === 'GROUP') counts.set(item.group_path, item.count)
    return counts
  }, [items])

  /** Call before expanding or collapsing a group: the next first page covers everything loaded so far. */
  const keepLoaded = () => setReload({ key: resultKey, size: items.length + pageSize })

  const { update } = data
  const commit = useCallback(
    (recordId: string, patch: Partial<T>) => {
      update?.(recordId, patch).catch((e: Error) => onError?.(e))
    },
    [update, onError],
  )

  return {
    data,
    items,
    totalRecords: lastPage?.total_records ?? 0,
    totalItems: lastPage?.total_items ?? 0,
    groupCounts,
    keepLoaded,
    /** Saves a patch; `undefined` when the data source is read-only. */
    commit: update ? commit : undefined,
  }
}
