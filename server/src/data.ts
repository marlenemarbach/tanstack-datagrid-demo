/**
 * Deterministic mock dataset. Property names and enum values follow the
 * Zalando guidelines (snake_case properties, UPPER_SNAKE_CASE enums).
 */

export const ORDER_STATUS = ['OPEN', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'ON_HOLD', 'CANCELLED'] as const
export const PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export const CHANNEL = ['WEB', 'MOBILE', 'STORE', 'PHONE', 'PARTNER'] as const
export const PAYMENT_METHOD = ['CARD', 'PAYPAL', 'INVOICE', 'BANK_TRANSFER'] as const
export const REGION = ['EMEA', 'AMER', 'APAC'] as const
export const CURRENCY = ['EUR', 'USD', 'GBP'] as const
export const KPI_COUNT = 40

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'date-time' | 'enum'

export interface Order {
  order_id: string
  customer_name: string
  email: string
  company: string
  city: string
  country: string
  region: (typeof REGION)[number]
  status: (typeof ORDER_STATUS)[number]
  priority: (typeof PRIORITY)[number]
  channel: (typeof CHANNEL)[number]
  payment_method: (typeof PAYMENT_METHOD)[number]
  category: string
  sales_rep: string
  warehouse: string
  is_paid: boolean
  is_express: boolean
  is_gift: boolean
  created_at: string
  delivery_date: string
  order_value: number
  currency: (typeof CURRENCY)[number]
  quantity: number
  discount_rate: number
  rating: number
  notes: string
  [kpi: `kpi_${string}`]: number
}

export interface FieldDescriptor {
  type: FieldType
  editable: boolean
  values?: readonly string[]
}

const FIRST = ['Ada', 'Grace', 'Alan', 'Linus', 'Margaret', 'Ken', 'Barbara', 'Dennis', 'Frances', 'Edsger', 'Hedy', 'Tim', 'Radia', 'John', 'Katherine', 'Niklaus', 'Sophie', 'Lukas', 'Mia', 'Jonas']
const LAST = ['Lovelace', 'Hopper', 'Turing', 'Torvalds', 'Hamilton', 'Thompson', 'Liskov', 'Ritchie', 'Allen', 'Dijkstra', 'Lamarr', 'Berners-Lee', 'Perlman', 'McCarthy', 'Johnson', 'Wirth', 'Wilson', 'Schmidt', 'Müller', 'Becker']
const COMPANIES = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Hooli', 'Stark', 'Wayne', 'Wonka', 'Tyrell', 'Cyberdyne', 'Soylent', 'Vandelay']
const PLACES: Array<[city: string, country: string, region: Order['region']]> = [
  ['Berlin', 'DE', 'EMEA'], ['Hamburg', 'DE', 'EMEA'], ['Munich', 'DE', 'EMEA'], ['Paris', 'FR', 'EMEA'], ['London', 'GB', 'EMEA'],
  ['Madrid', 'ES', 'EMEA'], ['Stockholm', 'SE', 'EMEA'], ['New York', 'US', 'AMER'], ['Austin', 'US', 'AMER'], ['Toronto', 'CA', 'AMER'],
  ['São Paulo', 'BR', 'AMER'], ['Tokyo', 'JP', 'APAC'], ['Sydney', 'AU', 'APAC'], ['Singapore', 'SG', 'APAC'], ['Seoul', 'KR', 'APAC'],
]
const CATEGORIES = ['Shoes', 'Apparel', 'Accessories', 'Sports', 'Beauty', 'Home', 'Kids', 'Outdoor']
const WAREHOUSES = ['WH-ERFURT', 'WH-MOENCHENGLADBACH', 'WH-LAHR', 'WH-GRYFINO', 'WH-OLSZTYNEK']
const NOTES = ['', '', '', 'Leave at the door', 'Call before delivery', 'Gift wrap requested', 'Fragile', 'Customer VIP', 'Partial shipment ok']

/** mulberry32: small, fast, seeded PRNG so every restart yields the same data. */
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const kpiKeys = Array.from({ length: KPI_COUNT }, (_, i) => `kpi_${String(i + 1).padStart(2, '0')}` as const)

export const fields: Record<string, FieldDescriptor> = {
  order_id: { type: 'string', editable: false },
  customer_name: { type: 'string', editable: true },
  email: { type: 'string', editable: true },
  company: { type: 'string', editable: true },
  city: { type: 'string', editable: true },
  country: { type: 'string', editable: true },
  region: { type: 'enum', editable: true, values: REGION },
  status: { type: 'enum', editable: true, values: ORDER_STATUS },
  priority: { type: 'enum', editable: true, values: PRIORITY },
  channel: { type: 'enum', editable: true, values: CHANNEL },
  payment_method: { type: 'enum', editable: true, values: PAYMENT_METHOD },
  category: { type: 'enum', editable: true, values: CATEGORIES },
  sales_rep: { type: 'string', editable: true },
  warehouse: { type: 'enum', editable: true, values: WAREHOUSES },
  is_paid: { type: 'boolean', editable: true },
  is_express: { type: 'boolean', editable: true },
  is_gift: { type: 'boolean', editable: true },
  created_at: { type: 'date-time', editable: false },
  delivery_date: { type: 'date', editable: true },
  order_value: { type: 'number', editable: true },
  currency: { type: 'enum', editable: true, values: CURRENCY },
  quantity: { type: 'number', editable: true },
  discount_rate: { type: 'number', editable: true },
  rating: { type: 'number', editable: true },
  notes: { type: 'string', editable: true },
  ...Object.fromEntries(kpiKeys.map((k) => [k, { type: 'number', editable: true } satisfies FieldDescriptor])),
}

/** Fields used by the fuzzy search. */
export const searchableFields = ['order_id', 'customer_name', 'email', 'company', 'city', 'sales_rep'] as const

export function generateOrders(count: number, seed = 42): Order[] {
  const r = rng(seed)
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(r() * arr.length)]!
  const start = Date.UTC(2023, 0, 1)
  const span = Date.UTC(2026, 9, 1) - start
  const orders: Order[] = new Array(count)

  for (let i = 0; i < count; i++) {
    const first = pick(FIRST)
    const last = pick(LAST)
    const company = pick(COMPANIES)
    const [city, country, region] = pick(PLACES)
    const created = start + Math.floor(r() * span)
    const order: Order = {
      order_id: `ORD-${String(i + 1).padStart(7, '0')}`,
      customer_name: `${first} ${last}`,
      email: `${first}.${last}@${company}.example`.toLowerCase(),
      company: `${company} ${pick(['GmbH', 'Inc.', 'Ltd.', 'AG', 'SE'])}`,
      city,
      country,
      region,
      status: pick(ORDER_STATUS),
      priority: pick(PRIORITY),
      channel: pick(CHANNEL),
      payment_method: pick(PAYMENT_METHOD),
      category: pick(CATEGORIES),
      sales_rep: `${pick(FIRST)} ${pick(LAST)}`,
      warehouse: pick(WAREHOUSES),
      is_paid: r() > 0.3,
      is_express: r() > 0.8,
      is_gift: r() > 0.9,
      created_at: new Date(created).toISOString(),
      delivery_date: new Date(created + (2 + Math.floor(r() * 12)) * 86_400_000).toISOString().slice(0, 10),
      order_value: Math.round(r() * 250_000) / 100,
      currency: pick(CURRENCY),
      quantity: 1 + Math.floor(r() * 20),
      discount_rate: Math.round(r() * 30) / 100,
      rating: 1 + Math.floor(r() * 5),
      notes: pick(NOTES),
    }
    for (const k of kpiKeys) order[k] = Math.round(r() * 100_000) / 100
    orders[i] = order
  }
  return orders
}
