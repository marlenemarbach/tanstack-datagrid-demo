import { configureStore } from '@reduxjs/toolkit'
import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import type { Order, QueryResponse } from '../api/orders'
import { gridInfiniteQueryOptions, patchRecordInPages, rtkDataSource, type GridQueryArg, type PageParam } from '../grid'
import type { OrdersApi } from './mockOrders'

const getOrderId = (order: Order) => order.order_id
const asError = (e: unknown) => ({ message: e instanceof Error ? e.message : String(e) })

/** An RTK Query API, store and grid data source over the mock orders API. */
export function createOrdersRtk(mock: OrdersApi) {
  const ordersApi = createApi({
    reducerPath: 'ordersApi',
    baseQuery: fakeBaseQuery<{ message: string }>(),
    endpoints: (build) => ({
      queryOrders: build.infiniteQuery<QueryResponse<Order>, GridQueryArg, PageParam>({
        infiniteQueryOptions: gridInfiniteQueryOptions,
        queryFn: async ({ queryArg, pageParam }, { signal }) => {
          try {
            return { data: await mock.fetchPage({ ...queryArg.request, ...pageParam }, signal) }
          } catch (e) {
            return { error: asError(e) }
          }
        },
      }),
      patchOrder: build.mutation<Order, { id: string; patch: Partial<Order> }>({
        queryFn: async ({ id, patch }) => {
          try {
            return { data: await mock.updateRecord(id, patch) }
          } catch (e) {
            return { error: asError(e) }
          }
        },
        // Optimistic: patch every cached page now, swap in the server record or roll back afterwards.
        async onQueryStarted({ id, patch }, { dispatch, getState, queryFulfilled }) {
          const patchAll = (update: (order: Order) => Order) =>
            ordersApi.util.selectCachedArgsForQuery(getState(), 'queryOrders').map((arg) =>
              dispatch(
                ordersApi.util.updateQueryData('queryOrders', arg, (draft) => {
                  draft.pages = patchRecordInPages(draft.pages, getOrderId, id, update)
                }),
              ),
            )
          const optimistic = patchAll((order) => ({ ...order, ...patch }) as Order)
          try {
            const { data } = await queryFulfilled
            patchAll(() => data)
          } catch {
            optimistic.forEach((p) => p.undo())
          }
        },
      }),
    }),
  })

  const store = configureStore({
    reducer: { [ordersApi.reducerPath]: ordersApi.reducer },
    middleware: (getDefault) => getDefault().concat(ordersApi.middleware),
  })

  const useOrders = rtkDataSource({
    useInfiniteQuery: ordersApi.useQueryOrdersInfiniteQuery,
    useUpdateMutation: ordersApi.usePatchOrderMutation,
  })

  return { ordersApi, store, useOrders }
}
