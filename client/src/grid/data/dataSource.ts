import type { QueryRequest, QueryResponse } from '../core/types'

/** Page parameter of the cursor-paged query endpoint. */
export type PageParam = { cursor?: string; limit: number }

export interface GridDataArgs<T> {
  /** Filters, sort, grouping and expanded groups; paging is up to the source. */
  request: QueryRequest
  /** Size of the first page; larger than `pageSize` after an expand/collapse so the scroll position survives. */
  initialLimit: number
  pageSize: number
  getRecordId: (record: T) => string
}

/** What the grid needs from a server-state library. */
export interface GridData<T> {
  pages: Array<QueryResponse<T>> | undefined
  hasNextPage: boolean
  fetchNextPage: () => unknown
  isFetching: boolean
  isFetchingNextPage: boolean
  /** Showing the previous request's rows while the current one loads. */
  isStale: boolean
  /** Nothing loaded yet. */
  isPending: boolean
  error: Error | null
  /** Saves a patch (ideally optimistically). Omit to make the grid read-only. Must be stable. */
  update?: (id: string, patch: Partial<T>) => Promise<unknown>
}

/**
 * Hook passed to `DataGrid` as `useData`. Its identity must stay the same
 * across renders: create it once at module level or in a `useMemo`.
 */
export type UseGridData<T> = (args: GridDataArgs<T>) => GridData<T>

export function nextPageParam(last: QueryResponse<unknown>, pageSize: number): PageParam | undefined {
  return last.next ? { cursor: last.next, limit: pageSize } : undefined
}

/** Returns `pages` with `update` applied to the record with the given id (immutable). */
export function patchRecordInPages<T>(
  pages: Array<QueryResponse<T>>,
  getRecordId: (record: T) => string,
  id: string,
  update: (record: T) => T,
): Array<QueryResponse<T>> {
  return pages.map((page) => ({
    ...page,
    items: page.items.map((it) => (it.kind === 'RECORD' && getRecordId(it.record) === id ? { ...it, record: update(it.record) } : it)),
  }))
}

/** Normalises the error shapes of the different libraries (Error, RTK `{ status, data }`, serialized errors). */
export function toError(error: unknown): Error | null {
  if (error == null) return null
  if (error instanceof Error) return error
  if (typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') return new Error(error.message)
    if ('error' in error && typeof error.error === 'string') return new Error(error.error)
    if ('status' in error) return new Error(`Request failed (${String(error.status)})`)
  }
  return new Error(String(error))
}
