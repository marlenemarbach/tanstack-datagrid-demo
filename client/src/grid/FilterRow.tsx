import { memo, useEffect, useRef, useState } from 'react'
import type { Column } from '@tanstack/react-table'
import type { FilterValue, QueryItem } from '../api/orders'
import type { Features, GridColumnMeta } from './features'

type AnyColumn = Column<Features, QueryItem<unknown>, unknown>

/**
 * One search field per column, rendered as a second header row. It edits the
 * same TanStack column filter state as the header popover, so both stay in sync.
 *
 * Text columns: "contains". Number/date columns accept small expressions,
 * all bounds inclusive:  `42`  `>10`  `<10`  `10..20`  `2025`  `2025-03`  `>2025-01-01`.
 * Discrete columns (enum/status/icon/boolean) use a native <select>.
 */
export const FilterCell = memo(function FilterCell(props: {
  column: AnyColumn
  /** The column's current filter value; passed so memo re-renders on change. */
  value: FilterValue | undefined
  width: number
  pinnedOffset: number | undefined
  isLastPinned: boolean
}) {
  const { column, value, width, pinnedOffset, isLastPinned } = props
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
      field = (
        <select
          className="tg-filter-input"
          aria-label={`Filter ${header}`}
          data-active={values.length ? 'true' : undefined}
          value={values.length > 1 ? '__multiple' : (values[0] ?? '')}
          onChange={(e) => set(e.target.value === '' ? undefined : { operator: 'IN', values: [e.target.value] })}
        >
          <option value="">All</option>
          {/* Multi-select is set via the popover; shown here as a summary. */}
          {values.length > 1 && (
            <option value="__multiple" disabled>
              {values.length} selected
            </option>
          )}
          {meta.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
      break
    }
    default:
      field = <TextFilterInput meta={meta} header={header} value={value} onChange={set} />
  }

  return (
    <div className={className} style={style}>
      {field}
    </div>
  )
})

function TextFilterInput(props: { meta: GridColumnMeta; header: string; value: FilterValue | undefined; onChange: (v: FilterValue | undefined) => void }) {
  const { meta, value, onChange } = props
  const kind = meta.type === 'number' ? 'number' : meta.type === 'date' || meta.type === 'datetime' ? 'date' : 'text'
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

  return (
    <input
      ref={ref}
      className="tg-filter-input"
      type="search"
      aria-label={`Filter ${props.header}`}
      aria-invalid={parsed === INVALID ? true : undefined}
      data-active={value ? 'true' : undefined}
      placeholder={kind === 'number' ? '>10, 10..20' : kind === 'date' ? '2025-03, >2025-01-01' : 'Search'}
      title={kind === 'text' ? undefined : 'Exact value, >x, <x or x..y (inclusive)'}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setDraft('')
      }}
    />
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
    if (value.from !== undefined && value.from === value.to) return String(value.from)
    if (value.to === undefined) return `>${value.from}`
    if (value.from === undefined) return `<${value.to}`
    return `${value.from}..${value.to}`
  }
  return ''
}

function parse(kind: 'text' | 'number' | 'date', raw: string): FilterValue | undefined | typeof INVALID {
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

  const bound = kind === 'number' ? numberBound : dateBound
  const from = lo ? bound(lo, 'start') : undefined
  const to = hi ? bound(hi, 'end') : undefined
  if (from === INVALID || to === INVALID || (from === undefined && to === undefined)) return INVALID
  return { operator: 'BETWEEN', from, to }
}

function numberBound(s: string): number | typeof INVALID {
  const n = Number(s.replace(',', '.'))
  return s !== '' && Number.isFinite(n) ? n : INVALID
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
