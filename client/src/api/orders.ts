/**
 * Client for the Orders API (see server/openapi.yaml). Types mirror the
 * contract; client and server deliberately share no code.
 */

// The query protocol is defined by the grid; the Orders API implements it.
import type { Filter, FilterValue, GroupItem, QueryItem, QueryRequest, QueryResponse, RecordItem } from '../grid'
export type { Filter, FilterValue, GroupItem, QueryItem, QueryRequest, QueryResponse, RecordItem }

export type OrderStatus = 'OPEN' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'ON_HOLD' | 'CANCELLED'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type Channel = 'WEB' | 'MOBILE' | 'STORE' | 'PHONE' | 'PARTNER'
export type PaymentMethod = 'CARD' | 'PAYPAL' | 'INVOICE' | 'BANK_TRANSFER'

export interface Order {
  order_id: string
  customer_name: string
  email: string
  company: string
  city: string
  country: string
  region: 'EMEA' | 'AMER' | 'APAC'
  status: OrderStatus
  priority: Priority
  channel: Channel
  payment_method: PaymentMethod
  category: string
  sales_rep: string
  warehouse: string
  is_paid: boolean
  is_express: boolean
  is_gift: boolean
  created_at: string
  delivery_date: string
  order_value: number
  currency: 'EUR' | 'USD' | 'GBP'
  quantity: number
  discount_rate: number
  rating: number
  notes: string
  [kpi: `kpi_${string}`]: number
}

/** RFC 9457 problem details. */
export class ProblemError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail?: string,
  ) {
    super(detail ?? title)
  }
}

const BASE = '/api'

/** Set by `build:static` (no backend, e.g. GitHub Pages); undefined in dev. */
declare const __IN_BROWSER_API__: boolean | undefined
const inBrowser =
  typeof __IN_BROWSER_API__ !== 'undefined' && __IN_BROWSER_API__ ? import('./inBrowser') : undefined

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'X-Flow-ID': crypto.randomUUID(), ...init.headers },
  })
  if (!res.ok) {
    const problem = res.headers.get('content-type')?.includes('application/problem+json')
      ? ((await res.json()) as { title: string; detail?: string })
      : { title: res.statusText }
    throw new ProblemError(res.status, problem.title, problem.detail)
  }
  return res.json() as Promise<T>
}

export function queryOrders(body: QueryRequest, signal?: AbortSignal) {
  if (inBrowser) return inBrowser.then((api) => api.queryOrders(body, signal))
  return request<QueryResponse<Order>>('/orders/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

export function patchOrder(orderId: string, patch: Partial<Order>) {
  if (inBrowser) return inBrowser.then((api) => api.patchOrder(orderId, patch))
  return request<Order>(`/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify(patch),
  })
}
