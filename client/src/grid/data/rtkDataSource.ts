import { useCallback } from 'react'
import type { QueryRequest, QueryResponse } from '../core/types'
import { nextPageParam, toError, type GridDataArgs, type GridData, type PageParam, type UseGridData } from './dataSource'

/** Query arg of the infinite query endpoint (its cache key). */
export interface GridQueryArg {
  request: QueryRequest
  pageSize: number
}

/** Spread into the endpoint's `infiniteQueryOptions`. */
export const gridInfiniteQueryOptions = {
  initialPageParam: { limit: 200 } as PageParam,
  getNextPageParam: (last: QueryResponse<unknown>, _all: unknown, _lastParam: unknown, _allParams: unknown, arg: GridQueryArg) =>
    nextPageParam(last, arg.pageSize),
}

/** The subset of a generated `use…InfiniteQuery` hook the grid relies on. */
type RtkInfiniteQueryHook<T> = (
  arg: GridQueryArg,
  options: { initialPageParam: PageParam },
) => {
  data?: { pages: Array<QueryResponse<T>> }
  currentData?: { pages: Array<QueryResponse<T>> }
  hasNextPage: boolean
  fetchNextPage: () => unknown
  isFetching: boolean
  isFetchingNextPage: boolean
  isLoading: boolean
  isUninitialized: boolean
  error?: unknown
}

/** The subset of a generated `use…Mutation` hook the grid relies on. */
type RtkMutationHook<T> = () => readonly [(arg: { id: string; patch: Partial<T> }) => { unwrap: () => Promise<unknown> }, ...Array<unknown>]

export interface RtkDataSourceOptions<T> {
  /** Generated hook of a `build.infiniteQuery<QueryResponse<T>, GridQueryArg, PageParam>` endpoint. */
  useInfiniteQuery: RtkInfiniteQueryHook<T>
  /**
   * Generated hook of a `build.mutation<T, { id, patch }>` endpoint. Optimistic
   * updates belong in its `onQueryStarted` (see `patchRecordInPages`). Omit for a read-only grid.
   */
  useUpdateMutation?: RtkMutationHook<T>
}

/** `DataGrid` data from RTK Query. Needs a react-redux `Provider`. */
export function rtkDataSource<T>({ useInfiniteQuery, useUpdateMutation }: RtkDataSourceOptions<T>): UseGridData<T> {
  function useRtkQuery({ request, initialLimit, pageSize }: GridDataArgs<T>): GridData<T> {
    const query = useInfiniteQuery({ request, pageSize }, { initialPageParam: { limit: initialLimit } })
    return {
      pages: query.data?.pages,
      hasNextPage: query.hasNextPage,
      fetchNextPage: query.fetchNextPage,
      isFetching: query.isFetching,
      isFetchingNextPage: query.isFetchingNextPage,
      // `data` keeps the last result after an arg change; `currentData` only holds the current arg's.
      isStale: query.data !== undefined && query.data !== query.currentData,
      isPending: query.isLoading || query.isUninitialized,
      error: toError(query.error),
    }
  }
  if (!useUpdateMutation) return useRtkQuery

  return function useRtkData(args: GridDataArgs<T>) {
    const data = useRtkQuery(args)
    const [trigger] = useUpdateMutation()
    const update = useCallback(
      (id: string, patch: Partial<T>) =>
        trigger({ id, patch })
          .unwrap()
          .catch((e: unknown) => Promise.reject(toError(e))),
      [trigger],
    )
    return { ...data, update }
  }
}
