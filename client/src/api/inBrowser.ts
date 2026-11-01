/**
 * The Orders API without a backend, for static hosting (GitHub Pages): the
 * server's query engine runs in the browser. Only bundled into the static
 * build (`build:static`), loaded lazily by `orders.ts`.
 */
import { generateOrders } from '../../../server/src/data.ts'
import { Problem } from '../../../server/src/problem.ts'
import { QueryEngine } from '../../../server/src/query.ts'
import { ProblemError, type Order, type QueryRequest, type QueryResponse } from './orders'

/** Same defaults as the server. */
const ROWS = 100_000
const LATENCY_MS = 150

let engine: QueryEngine | undefined

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const t = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(t)
      reject(signal.reason)
    })
  })
}

async function respond<R>(run: (engine: QueryEngine) => unknown, signal?: AbortSignal): Promise<R> {
  await delay(LATENCY_MS, signal)
  engine ??= new QueryEngine(generateOrders(ROWS))
  try {
    // Round-trip through JSON so callers get copies, like over HTTP.
    return JSON.parse(JSON.stringify(run(engine))) as R
  } catch (err) {
    if (err instanceof Problem) throw new ProblemError(err.status, err.title, err.detail)
    throw err
  }
}

export function queryOrders(body: QueryRequest, signal?: AbortSignal) {
  return respond<QueryResponse<Order>>((e) => e.query(body as Parameters<QueryEngine['query']>[0]), signal)
}

export function patchOrder(orderId: string, patch: Partial<Order>) {
  return respond<Order>((e) => e.patch(orderId, patch as Record<string, unknown>))
}
