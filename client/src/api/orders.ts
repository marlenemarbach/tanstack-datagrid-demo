/**
 * Client for the Orders API (see server/openapi.yaml). Types mirror the
 * contract; client and server deliberately share no code.
 */

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

export type Filter =
  | { field: string; operator: 'CONTAINS'; value: string }
  | { field: string; operator: 'IN'; values: Array<string> }
  | { field: string; operator: 'EQUALS'; value: string | number | boolean }
  | { field: string; operator: 'BETWEEN'; from?: string | number; to?: string | number }

/** A filter without its field; this is what lives in TanStack column filter state. */
export type FilterValue = Filter extends infer F ? (F extends Filter ? Omit<F, 'field'> : never) : never

export interface QueryRequest {
  filters?: Array<Filter>
  sort?: Array<string>
  group_by?: Array<string>
  expanded_groups?: Array<string>
  limit?: number
  cursor?: string
}

export type GroupItem = {
  kind: 'GROUP'
  group_path: string
  depth: number
  field: string
  value: string | number | boolean
  count: number
}
export type RecordItem<T> = { kind: 'RECORD'; group_path: string; depth: number; record: T }
export type QueryItem<T> = GroupItem | RecordItem<T>

export interface QueryResponse<T> {
  items: Array<QueryItem<T>>
  self: string
  next?: string
  total_items: number
  total_records: number
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
  return request<QueryResponse<Order>>('/orders/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
}

export function patchOrder(orderId: string, patch: Partial<Order>) {
  return request<Order>(`/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify(patch),
  })
}
