import { useCallback } from 'react'
import { keepPreviousData, useInfiniteQuery, useMutation, useQueryClient, type InfiniteData, type QueryKey } from '@tanstack/react-query'
import type { QueryRequest, QueryResponse } from '../core/types'
import { nextPageParam, patchRecordInPages, type GridDataArgs, type PageParam, type UseGridData } from './dataSource'

export interface TanstackDataSourceOptions<T> {
  /** Prefix for every query; also used to patch the cache after edits. */
  queryKey: QueryKey
  fetchPage: (request: QueryRequest, signal: AbortSignal) => Promise<QueryResponse<T>>
  updateRecord?: (id: string, patch: Partial<T>) => Promise<T>
}

type Pages<T> = InfiniteData<QueryResponse<T>, PageParam>

/** `DataGrid` data from TanStack Query. Needs a `QueryClientProvider`. */
export function tanstackDataSource<T>({ queryKey, fetchPage, updateRecord }: TanstackDataSourceOptions<T>): UseGridData<T> {
  return function useTanstackData({ request, initialLimit, pageSize, getRecordId }: GridDataArgs<T>) {
    const queryClient = useQueryClient()

    const query = useInfiniteQuery({
      queryKey: [...queryKey, request],
      queryFn: ({ pageParam, signal }) => fetchPage({ ...request, ...pageParam }, signal),
      initialPageParam: { limit: initialLimit } as PageParam,
      getNextPageParam: (last) => nextPageParam(last, pageSize),
      placeholderData: keepPreviousData,
    })

    const patchCache = (id: string, update: (record: T) => T) =>
      queryClient.setQueriesData<Pages<T>>({ queryKey }, (old) => (old ? { ...old, pages: patchRecordInPages(old.pages, getRecordId, id, update) } : old))

    const mutation = useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<T> }) => updateRecord!(id, patch),
      onMutate: async ({ id, patch }) => {
        await queryClient.cancelQueries({ queryKey })
        const snapshot = queryClient.getQueriesData({ queryKey })
        patchCache(id, (record) => ({ ...record, ...patch }))
        return { snapshot }
      },
      onError: (_error, _vars, ctx) => ctx?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data)),
      onSuccess: (record, { id }) => patchCache(id, () => record),
    })

    // `mutateAsync` is stable.
    const { mutateAsync } = mutation
    const update = useCallback((id: string, patch: Partial<T>) => mutateAsync({ id, patch }), [mutateAsync])

    return {
      pages: query.data?.pages,
      hasNextPage: query.hasNextPage,
      fetchNextPage: query.fetchNextPage,
      isFetching: query.isFetching,
      isFetchingNextPage: query.isFetchingNextPage,
      isStale: query.isPlaceholderData,
      isPending: query.isPending,
      error: query.error,
      update: updateRecord ? update : undefined,
    }
  }
}
