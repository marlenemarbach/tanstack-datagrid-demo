import type { ReactNode } from 'react'
import type { GridColumnMeta, OptionDef } from '../core/features'
import { Icon } from '../icons/icons'

// ---------------------------------------------------------------------------
// Formatting (Intl formatters are expensive to create, so they are cached)
// ---------------------------------------------------------------------------

// Keyed by the column's meta object, so the per-cell lookup is a single WeakMap hit.
const formatterCache = new WeakMap<GridColumnMeta, Intl.NumberFormat | Intl.DateTimeFormat>()

function formatter<F extends Intl.NumberFormat | Intl.DateTimeFormat>(meta: GridColumnMeta, create: () => F): F {
  let f = formatterCache.get(meta)
  if (!f) formatterCache.set(meta, (f = create()))
  return f as F
}

const DEFAULT_DATE: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
const DEFAULT_DATETIME: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }

/**
 * `Intl.format()` dominates cell rendering, and horizontal scrolling re-renders
 * every visible cell. Formatted strings are cached per column (bounded).
 */
const formattedCache = new WeakMap<GridColumnMeta, Map<unknown, string>>()
const FORMATTED_LIMIT = 5000

export function formatValue(meta: GridColumnMeta | undefined, value: unknown): string {
  if (value === undefined || value === null || value === '') return ''
  if (!meta) return String(value)
  let cache = formattedCache.get(meta)
  if (!cache) formattedCache.set(meta, (cache = new Map()))
  let text = cache.get(value)
  if (text === undefined) {
    if (cache.size >= FORMATTED_LIMIT) cache.clear()
    cache.set(value, (text = formatUncached(meta, value)))
  }
  return text
}

function formatUncached(meta: GridColumnMeta, value: unknown): string {
  switch (meta.type) {
    case 'number': {
      const options = meta.format as Intl.NumberFormatOptions | undefined
      return formatter(meta, () => new Intl.NumberFormat(undefined, options)).format(value as number)
    }
    case 'date':
    case 'datetime': {
      const options = (meta.format as Intl.DateTimeFormatOptions | undefined) ?? (meta.type === 'date' ? DEFAULT_DATE : DEFAULT_DATETIME)
      const date = new Date(meta.type === 'date' ? `${value as string}T00:00:00` : (value as string))
      return formatter(meta, () => new Intl.DateTimeFormat(undefined, options)).format(date)
    }
    case 'enum':
    case 'status':
    case 'icon':
      return findOption(meta, value)?.label ?? String(value)
    case 'boolean':
      return value ? 'Yes' : 'No'
    default:
      return String(value)
  }
}

const optionIndex = new WeakMap<Array<OptionDef>, Map<string, OptionDef>>()

function findOption(meta: GridColumnMeta, value: unknown): OptionDef | undefined {
  if (!meta.options) return undefined
  let index = optionIndex.get(meta.options)
  if (!index) optionIndex.set(meta.options, (index = new Map(meta.options.map((o) => [o.value, o]))))
  return index.get(String(value))
}

/** Read-only presentation of a value; also used for group rows. */
export function renderValue(meta: GridColumnMeta | undefined, value: unknown): ReactNode {
  if (value === undefined || value === null) return null
  switch (meta?.type) {
    case 'boolean':
      return <Icon name={value ? 'check' : 'close'} className={value ? 'tg-bool tg-bool--true' : 'tg-bool tg-bool--false'} title={value ? 'Yes' : 'No'} />
    case 'status': {
      const option = findOption(meta, value)
      return (
        <span className="tg-status" data-tone={option?.tone ?? 'neutral'}>
          {option?.label ?? String(value)}
        </span>
      )
    }
    case 'icon': {
      const option = findOption(meta, value)
      if (!option?.icon) return String(value)
      return (
        <span className="tg-icon-value" data-tone={option.tone}>
          <Icon name={option.icon} title={meta.showLabel ? undefined : option.label} />
          {meta.showLabel && <span>{option.label}</span>}
        </span>
      )
    }
    default:
      return formatValue(meta, value)
  }
}
