import { fields, type Order } from './data.ts'
import { Problem } from './problem.ts'

// ---------------------------------------------------------------------------
// Contract (mirrors openapi.yaml)
// ---------------------------------------------------------------------------

export type Filter =
  | { field: string; operator: 'CONTAINS'; value: string }
  | { field: string; operator: 'IN'; values: Array<string> }
  | { field: string; operator: 'EQUALS'; value: string | number | boolean }
  | { field: string; operator: 'BETWEEN'; from?: string | number; to?: string | number }

export interface QueryRequest {
  filters?: Array<Filter>
  /** Zalando style sort expressions, e.g. `["-created_at", "+customer_name"]`. */
  sort?: Array<string>
  group_by?: Array<string>
  /** Group paths (as returned in `group_path`) that are expanded. */
  expanded_groups?: Array<string>
  limit?: number
  cursor?: string
}

export type QueryItem =
  | {
      kind: 'GROUP'
      group_path: string
      depth: number
      field: string
      value: string | number | boolean
      count: number
    }
  | { kind: 'RECORD'; group_path: string; depth: number; record: Order }

export interface QueryResponse {
  items: Array<QueryItem>
  self: string
  next?: string
  /** Number of items (group headers + records) in the flattened result. */
  total_items: number
  /** Number of orders matching the filters. */
  total_records: number
}

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 5000

// ---------------------------------------------------------------------------
// Cursor: opaque base64url token binding an offset to a query fingerprint
// ---------------------------------------------------------------------------

interface CursorPayload {
  o: number
  h: string
}

// btoa/atob instead of Buffer, so the engine also runs in a browser (Storybook). The payload is ASCII.
const encodeCursor = (payload: CursorPayload) =>
  btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function decodeCursor(cursor: string): CursorPayload {
  try {
    const payload = JSON.parse(atob(cursor.replace(/-/g, '+').replace(/_/g, '/'))) as CursorPayload
    if (typeof payload.o === 'number' && typeof payload.h === 'string') return payload
  } catch {
    // fall through
  }
  throw new Problem(400, 'Invalid cursor', 'The cursor is malformed.')
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function assertField(field: unknown, where: string): asserts field is string {
  if (typeof field !== 'string' || !(field in fields)) {
    throw new Problem(400, 'Unknown field', `\`${String(field)}\` in \`${where}\` is not a known field.`)
  }
}

function parseSort(sort: Array<string>) {
  return sort.map((expr) => {
    const desc = expr.startsWith('-')
    const field = expr.replace(/^[+-]/, '')
    assertField(field, 'sort')
    return { field, desc }
  })
}

function validate(req: QueryRequest) {
  for (const f of req.filters ?? []) assertField(f.field, 'filters')
  for (const g of req.group_by ?? []) assertField(g, 'group_by')
  if (req.limit !== undefined && (!Number.isInteger(req.limit) || req.limit < 1 || req.limit > MAX_LIMIT)) {
    throw new Problem(400, 'Invalid limit', `\`limit\` must be an integer between 1 and ${MAX_LIMIT}.`)
  }
}

// ---------------------------------------------------------------------------
// Processing
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>
const get = (o: Order, field: string) => (o as unknown as Row)[field]

function matchesFilter(row: Order, f: Filter): boolean {
  const v = get(row, f.field)
  switch (f.operator) {
    case 'CONTAINS':
      return String(v ?? '').toLowerCase().includes(f.value.toLowerCase())
    case 'IN':
      return f.values.length === 0 || f.values.includes(String(v))
    case 'EQUALS':
      return v === f.value
    case 'BETWEEN': {
      if (f.from !== undefined && f.from !== '' && (v as number | string) < f.from) return false
      // Date-only upper bounds are inclusive for the whole day.
      const to = typeof f.to === 'string' && f.to.length === 10 && fields[f.field]?.type === 'date-time' ? `${f.to}T23:59:59.999Z` : f.to
      if (to !== undefined && to !== '' && (v as number | string) > to) return false
      return true
    }
  }
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === undefined || a === null) return 1
  if (b === undefined || b === null) return -1
  return (a as number) < (b as number) ? -1 : 1
}

interface GroupNode {
  path: string
  field: string
  value: string | number | boolean
  depth: number
  count: number
  children: Array<GroupNode> | null
  records: Array<Order> | null
}

const pathSegment = (field: string, value: unknown) => `${field}:${encodeURIComponent(String(value))}`

function buildGroups(rows: Array<Order>, groupBy: Array<string>, depth: number, parentPath: string): Array<GroupNode> {
  const field = groupBy[depth]!
  const nodes: Array<GroupNode> = []
  let start = 0
  // Rows are pre-sorted by every group field, so groups are consecutive runs.
  for (let i = 1; i <= rows.length; i++) {
    const prev = get(rows[i - 1]!, field)
    if (i < rows.length && get(rows[i]!, field) === prev) continue
    const slice = rows.slice(start, i)
    const path = parentPath ? `${parentPath}/${pathSegment(field, prev)}` : pathSegment(field, prev)
    const isLeafLevel = depth === groupBy.length - 1
    nodes.push({
      path,
      field,
      value: prev as GroupNode['value'],
      depth,
      count: slice.length,
      children: isLeafLevel ? null : buildGroups(slice, groupBy, depth + 1, path),
      records: isLeafLevel ? slice : null,
    })
    start = i
  }
  return nodes
}

function flatten(nodes: Array<GroupNode>, expanded: Set<string>, out: Array<QueryItem>) {
  for (const node of nodes) {
    out.push({ kind: 'GROUP', group_path: node.path, depth: node.depth, field: node.field, value: node.value, count: node.count })
    if (!expanded.has(node.path)) continue
    if (node.children) flatten(node.children, expanded, out)
    else for (const record of node.records!) out.push({ kind: 'RECORD', group_path: node.path, depth: node.depth + 1, record })
  }
}

// ---------------------------------------------------------------------------
// Engine with small LRU caches so infinite scrolling only slices
// ---------------------------------------------------------------------------

class Lru<V> {
  private map = new Map<string, V>()
  constructor(private size: number) {}
  get(key: string) {
    const v = this.map.get(key)
    if (v !== undefined) {
      this.map.delete(key)
      this.map.set(key, v)
    }
    return v
  }
  set(key: string, v: V) {
    this.map.set(key, v)
    if (this.map.size > this.size) this.map.delete(this.map.keys().next().value!)
  }
  clear() {
    this.map.clear()
  }
}

export class QueryEngine {
  private processed = new Lru<{ rows: Array<Order>; groups: Array<GroupNode> | null }>(8)
  private flattened = new Lru<Array<QueryItem>>(16)
  private byId: Map<string, Order>

  constructor(private orders: Array<Order>) {
    this.byId = new Map(orders.map((o) => [o.order_id, o]))
  }

  get size() {
    return this.orders.length
  }

  query(req: QueryRequest): QueryResponse {
    validate(req)
    const filters = req.filters ?? []
    const sort = parseSort(req.sort ?? [])
    const groupBy = req.group_by ?? []
    const expanded = [...new Set(req.expanded_groups ?? [])].sort()
    const limit = req.limit ?? DEFAULT_LIMIT

    const processKey = JSON.stringify([filters, sort, groupBy])
    const flatKey = JSON.stringify([processKey, expanded])
    const hash = fingerprint(flatKey)

    let offset = 0
    if (req.cursor) {
      const cursor = decodeCursor(req.cursor)
      if (cursor.h !== hash) {
        throw new Problem(400, 'Cursor mismatch', 'The cursor was issued for a different query. Restart without a cursor.')
      }
      offset = cursor.o
    }

    let processed = this.processed.get(processKey)
    if (!processed) {
      processed = this.process(filters, sort, groupBy)
      this.processed.set(processKey, processed)
    }

    let items = this.flattened.get(flatKey)
    if (!items) {
      items = []
      if (processed.groups) flatten(processed.groups, new Set(expanded), items)
      else for (const record of processed.rows) items.push({ kind: 'RECORD', group_path: '', depth: 0, record })
      this.flattened.set(flatKey, items)
    }

    const end = Math.min(offset + limit, items.length)
    return {
      items: items.slice(offset, end),
      self: encodeCursor({ o: offset, h: hash }),
      next: end < items.length ? encodeCursor({ o: end, h: hash }) : undefined,
      total_items: items.length,
      total_records: processed.rows.length,
    }
  }

  patch(orderId: string, patch: Record<string, unknown>): Order {
    const order = this.byId.get(orderId)
    if (!order) throw new Problem(404, 'Order not found', `Order \`${orderId}\` does not exist.`)
    if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new Problem(400, 'Invalid patch', 'Body must be a JSON merge patch object.')
    }
    for (const [field, value] of Object.entries(patch)) {
      const desc = fields[field]
      if (!desc) throw new Problem(400, 'Unknown field', `\`${field}\` is not a known field.`)
      if (!desc.editable) throw new Problem(422, 'Field is read-only', `\`${field}\` cannot be modified.`)
      const ok =
        (desc.type === 'number' && typeof value === 'number' && Number.isFinite(value)) ||
        (desc.type === 'boolean' && typeof value === 'boolean') ||
        (desc.type === 'string' && typeof value === 'string') ||
        (desc.type === 'date' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) ||
        (desc.type === 'enum' && typeof value === 'string' && desc.values!.includes(value))
      if (!ok) throw new Problem(422, 'Invalid value', `\`${JSON.stringify(value)}\` is not a valid value for \`${field}\`.`)
    }
    Object.assign(order, patch)
    this.processed.clear()
    this.flattened.clear()
    return order
  }

  private process(filters: Array<Filter>, sort: Array<{ field: string; desc: boolean }>, groupBy: Array<string>) {
    const rows = filters.length ? this.orders.filter((o) => filters.every((f) => matchesFilter(o, f))) : this.orders.slice()

    // Group fields sort first (honouring a requested direction), then the rest.
    const keys = [
      ...groupBy.map((field) => ({ field, desc: sort.find((s) => s.field === field)?.desc ?? false })),
      ...sort.filter((s) => !groupBy.includes(s.field)),
    ]
    if (keys.length) {
      rows.sort((a, b) => {
        for (const { field, desc } of keys) {
          const c = compare(get(a, field), get(b, field))
          if (c) return desc ? -c : c
        }
        return 0
      })
    }

    return { rows, groups: groupBy.length ? buildGroups(rows, groupBy, 0, '') : null }
  }
}

/** FNV-1a; only used to bind cursors to the query they were issued for. */
function fingerprint(s: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193)
  return (h >>> 0).toString(36)
}
