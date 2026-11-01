import type { Order, QueryRequest, QueryResponse } from '../api/orders'
// Stories only: the real server engine, run in the browser instead of behind HTTP.
import { generateOrders } from '../../../server/src/data.ts'
import { QueryEngine } from '../../../server/src/query.ts'

export interface MockOptions {
  /** Number of generated orders (same seed as the server, so data matches). */
  rows?: number
  /** Simulated network latency per request. */
  latency?: number
  /** Every request fails with this message. */
  fail?: string
  /** Requests never resolve (loading state). */
  hang?: boolean
}

export interface OrdersApi {
  fetchPage: (request: QueryRequest, signal: AbortSignal) => Promise<QueryResponse<Order>>
  updateRecord: (id: string, patch: Partial<Order>) => Promise<Order>
}

const engines = new Map<number, QueryEngine>()

function engine(rows: number) {
  let e = engines.get(rows)
  if (!e) engines.set(rows, (e = new QueryEngine(generateOrders(rows))))
  return e
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(signal.reason)
    })
  })
}

export function createOrdersApi({ rows = 5000, latency = 150, fail, hang }: MockOptions = {}): OrdersApi {
  const respond = async <R>(run: () => R, signal?: AbortSignal): Promise<R> => {
    if (hang) return new Promise<R>(() => {})
    await delay(latency, signal)
    if (fail) throw new Error(fail)
    return run()
  }
  return {
    fetchPage: (request, signal) => respond(() => engine(rows).query(request) as unknown as QueryResponse<Order>, signal),
    updateRecord: (id, patch) => respond(() => engine(rows).patch(id, patch) as unknown as Order),
  }
}
