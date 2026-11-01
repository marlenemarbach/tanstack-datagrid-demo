import { memo, useEffect, useRef, useState } from 'react'
import type { Column } from '@tanstack/react-table'
import type { FilterValue, QueryItem } from '../api/orders'
import type { Features, GridColumnMeta } from './features'
import { isoToLocal, localToIso } from './filterDates'
import { Icon } from './icons'

type AnyColumn = Column<Features, QueryItem<unknown>, unknown>

/**
 * One search field per column, rendered as a second header row. It edits the
 * TanStack column filter state that is sent to the server.
 *
 * Text columns: "contains". Number/date columns accept small expressions,
 * all bounds inclusive:  `42`  `>10`  `<10`  `10..20`  `2025`  `2025-03`  `>2025-01-01`.
 * Datetime columns also take a local time:  `2025-03-14 10:30`  `>2025-03-14 08:00`.
 * Those columns also get a button that opens the popover's From/To fields
 * (native date / date-time pickers). Boolean columns use a native <select>;
 * enum/status/icon columns open the popover's checkbox list for multi-select.
 */
export const FilterCell = memo(function FilterCell(props: {
  column: AnyColumn
  /** The column's current filter value; passed so memo re-renders on change. */
  value: FilterValue | undefined
  width: number
  pinnedOffset: number | undefined
  isLastPinned: boolean
  /** Opens the multi-select popover; must be stable so memo holds. */
  onOpen: (column: AnyColumn, anchor: HTMLElement) => void
}) {
  const { column, value, width, pinnedOffset, isLastPinned, onOpen } = props
  const meta = column.columnDef.meta ?? {}
  const className = `tg-fc${pinnedOffset !== undefined ? ' tg-pinned' : ''}${isLastPinned ? ' tg-pinned-last' : ''}`
  const style = { width, insetInlineStart: pinnedOffset }
  const header = typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id

  if (!column.getCanFilter()) return <div className={className} style={style} />

  const set = (next: FilterValue | undefined) => column.setFilterValue(next)

  let field
  switch (meta.type) {
    case 'boolean':
      field = (
        <select
          className="tg-filter-input"
          aria-label={`Filter ${header}`}
          data-active={value ? 'true' : undefined}
          value={value?.operator === 'EQUALS' ? String(value.value) : ''}
          onChange={(e) => set(e.target.value === '' ? undefined : { operator: 'EQUALS', value: e.target.value === 'true' })}
        >
          <option value="">All</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      )
      break
    case 'enum':
    case 'status':
    case 'icon': {
      const values = value?.operator === 'IN' ? value.values : []
      const summary =
        values.length === 0 ? 'All' : values.length === 1 ? (meta.options?.find((o) => o.value === values[0])?.label ?? values[0]) : `${values.length} selected`
      field = (
        <button
          type="button"
          className="tg-filter-input tg-filter-select"
          aria-label={`Filter ${header}`}
          aria-haspopup="dialog"
          data-active={values.length ? 'true' : undefined}
          onClick={(e) => onOpen(column, e.currentTarget)}
        >
          <span className="tg-filter-select-text">{summary}</span>
          <Icon name="chevron-down" />
        </button>
      )
      break
    }
    default:
      field = <TextFilterInput meta={meta} header={header} value={value} onChange={set} onOpenRange={(anchor) => onOpen(column, anchor)} />
  }

  return (
    <div className={className} style={style}>
      {field}
    </div>
  )
})

function TextFilterInput(props: {
  meta: GridColumnMeta
  header: string
  value: FilterValue | undefined
  onChange: (v: FilterValue | undefined) => void
  onOpenRange: (anchor: HTMLElement) => void
}) {
  const { meta, value, onChange, onOpenRange } = props
  const kind = meta.type === 'number' || meta.type === 'date' || meta.type === 'datetime' ? meta.type : 'text'
  const external = toText(value)
  const [draft, setDraft] = useState(external)
  const ref = useRef<HTMLInputElement>(null)
  const parsed = parse(kind, draft)

  // Pick up changes made elsewhere (popover, reset) unless the user is typing here.
  useEffect(() => {
    if (document.activeElement !== ref.current) setDraft(external)
  }, [external])

  useEffect(() => {
    if (parsed === INVALID || draft === external) return
    const t = setTimeout(() => onChange(parsed), 300)
    return () => clearTimeout(t)
    // Only the draft restarts the timer; `parsed` derives from it.
  }, [draft])

  const input = (
    <input
      ref={ref}
      className="tg-filter-input"
      type="search"
      aria-label={`Filter ${props.header}`}
      aria-invalid={parsed === INVALID ? true : undefined}
      data-active={value ? 'true' : undefined}
      placeholder={kind === 'number' ? '>10, 10..20' : kind === 'date' ? '2025-03, >2025-01-01' : kind === 'datetime' ? '2025-03, >2025-03-14 10:30' : 'Search'}
      title={kind === 'text' ? undefined : 'Exact value, >x, <x or x..y (inclusive)'}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setDraft('')
      }}
    />
  )
  if (kind === 'text')
    return (
      <div className="tg-filter-search">
        <Icon name="search" />
        {input}
      </div>
    )

  return (
    <div className="tg-filter-range">
      {input}
      <button
        type="button"
        className="tg-filter-range-btn"
        aria-label={kind !== 'number' ? `Pick ${props.header} date range` : `Set ${props.header} range`}
        aria-haspopup="dialog"
        title={kind !== 'number' ? 'Pick dates' : 'Set range'}
        onClick={(e) => onOpenRange(e.currentTarget.parentElement!)}
      >
        <Icon name={kind !== 'number' ? 'date-range' : 'tune'} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Expression parsing
// ---------------------------------------------------------------------------

const INVALID = Symbol('invalid')

function toText(value: FilterValue | undefined): string {
  if (!value) return ''
  if (value.operator === 'CONTAINS') return value.value
  if (value.operator === 'BETWEEN') {
    // ISO datetimes show as local minutes, so a single-minute range collapses to one value.
    const show = (v: string | number | undefined) => (v === undefined ? '' : typeof v === 'string' ? isoToLocal(v).replace('T', ' ') : String(v))
    const from = show(value.from)
    const to = show(value.to)
    if (from && from === to) return from
    if (!to) return from && `>${from}`
    if (!from) return `<${to}`
    return `${from}..${to}`
  }
  return ''
}

function parse(kind: 'text' | 'number' | 'date' | 'datetime', raw: string): FilterValue | undefined | typeof INVALID {
  const text = raw.trim()
  if (!text) return undefined
  if (kind === 'text') return { operator: 'CONTAINS', value: text }

  let lo: string | undefined
  let hi: string | undefined
  const range = /^(.*?)\.\.(.*)$/.exec(text)
  if (range) [lo, hi] = [range[1]!.trim(), range[2]!.trim()]
  else if (/^>=?/.test(text)) lo = text.replace(/^>=?/, '').trim()
  else if (/^<=?/.test(text)) hi = text.replace(/^<=?/, '').trim()
  else lo = hi = text

  const bound = kind === 'number' ? numberBound : kind === 'datetime' ? datetimeBound : dateBound
  const from = lo ? bound(lo, 'start') : undefined
  const to = hi ? bound(hi, 'end') : undefined
  if (from === INVALID || to === INVALID || (from === undefined && to === undefined)) return INVALID
  return { operator: 'BETWEEN', from, to }
}

function numberBound(s: string): number | typeof INVALID {
  const n = Number(s.replace(',', '.'))
  return s !== '' && Number.isFinite(n) ? n : INVALID
}

/** `2025-03-14 10:30` -> UTC ISO; anything else is treated as a date. */
function datetimeBound(s: string, edge: 'start' | 'end'): string | typeof INVALID {
  if (!/[ T]/.test(s)) return dateBound(s, edge)
  return localToIso(s, edge) ?? INVALID
}

/** `2025` / `2025-03` / `2025-03-14` -> first or last day of that period. */
function dateBound(s: string, edge: 'start' | 'end'): string | typeof INVALID {
  const m = /^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/.exec(s)
  if (!m) return INVALID
  const year = Number(m[1])
  const month = m[2] ? Number(m[2]) : undefined
  const day = m[3] ? Number(m[3]) : undefined
  if ((month !== undefined && (month < 1 || month > 12)) || (day !== undefined && (day < 1 || day > 31))) return INVALID
  const pad = (n: number) => String(n).padStart(2, '0')
  if (day !== undefined) return `${year}-${pad(month!)}-${pad(day)}`
  if (month !== undefined) {
    return edge === 'start' ? `${year}-${pad(month)}-01` : `${year}-${pad(month)}-${pad(new Date(Date.UTC(year, month, 0)).getUTCDate())}`
  }
  return edge === 'start' ? `${year}-01-01` : `${year}-12-31`
}
