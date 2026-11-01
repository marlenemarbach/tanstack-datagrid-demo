import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { CellContext } from '@tanstack/react-table'
import type { QueryItem } from '../api/orders'
import type { Features, GridColumnMeta, OptionDef } from './features'
import { Icon } from './icons'

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

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

type Ctx = CellContext<Features, QueryItem<unknown>, unknown>

/**
 * Default cell. Display mode is plain markup; the editor (a real <input>) is
 * only mounted for the single cell being edited.
 */
export function GridCell(ctx: Ctx) {
  const meta = ctx.column.columnDef.meta
  const tableMeta = ctx.table.options.meta!
  const editing = tableMeta.editing
  if (editing && editing.rowId === ctx.row.id && editing.columnId === ctx.column.id) {
    return <CellEditor ctx={ctx} seed={editing.seed} />
  }
  return renderValue(meta, ctx.getValue())
}

function CellEditor({ ctx, seed }: { ctx: Ctx; seed?: string }) {
  const meta = ctx.column.columnDef.meta ?? {}
  const tableMeta = ctx.table.options.meta!
  const original = ctx.getValue()
  const done = useRef(false)

  const finish = (commit: boolean, value?: unknown, refocus = true) => {
    if (done.current) return
    done.current = true
    if (commit && value !== original) tableMeta.commit(ctx.row.id, ctx.column.id, value)
    tableMeta.stopEdit(refocus)
  }

  if (meta.type === 'enum' || meta.type === 'status' || meta.type === 'icon') {
    const initial = seed ? (meta.options?.find((o) => o.label.toLowerCase().startsWith(seed.toLowerCase()))?.value ?? original) : original
    return <SelectEditor options={meta.options ?? []} initial={String(initial)} onDone={finish} />
  }

  const toInput = (v: unknown) => (v === undefined || v === null ? '' : String(v))
  const initial = seed !== undefined && meta.type !== 'date' ? seed : toInput(original)
  const parse = (raw: string): { ok: boolean; value?: unknown } => {
    if (meta.type === 'number') {
      const n = Number(raw.replace(',', '.'))
      return raw.trim() !== '' && Number.isFinite(n) ? { ok: true, value: n } : { ok: false }
    }
    if (meta.type === 'date') return raw ? { ok: true, value: raw } : { ok: false }
    return { ok: true, value: raw }
  }

  return <TextEditor type={meta.type === 'date' ? 'date' : 'text'} numeric={meta.type === 'number'} initial={initial} parse={parse} onDone={finish} />
}

type Finish = (commit: boolean, value?: unknown, refocus?: boolean) => void

function editorKeys(e: KeyboardEvent, commit: () => void, cancel: () => void) {
  e.stopPropagation()
  if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault()
    commit()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    cancel()
  }
}

function TextEditor(props: {
  type: 'text' | 'date'
  numeric: boolean
  initial: string
  parse: (raw: string) => { ok: boolean; value?: unknown }
  onDone: Finish
}) {
  const [value, setValue] = useState(props.initial)
  const ref = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    const input = ref.current!
    input.focus()
    if (props.type === 'text') input.setSelectionRange(input.value.length, input.value.length)
  }, [props.type])

  const commit = (refocus: boolean) => {
    const parsed = props.parse(value)
    props.onDone(parsed.ok, parsed.value, refocus)
  }

  return (
    <input
      ref={ref}
      className="tg-editor"
      type={props.type}
      inputMode={props.numeric ? 'decimal' : undefined}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => editorKeys(e, () => commit(true), () => props.onDone(false))}
      onBlur={() => commit(false)}
    />
  )
}

function SelectEditor({ options, initial, onDone }: { options: Array<OptionDef>; initial: string; onDone: Finish }) {
  const ref = useRef<HTMLSelectElement>(null)
  useLayoutEffect(() => ref.current!.focus(), [])
  return (
    <select
      ref={ref}
      className="tg-editor"
      defaultValue={initial}
      onChange={(e) => onDone(true, e.target.value)}
      onKeyDown={(e) => editorKeys(e, () => onDone(true, ref.current!.value), () => onDone(false))}
      onBlur={() => onDone(false, undefined, false)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// ---------------------------------------------------------------------------
// Native tri-state checkbox (cheap enough to render in every row)
// ---------------------------------------------------------------------------

export function Checkbox(props: { checked: boolean; indeterminate?: boolean; label: string; onToggle: (checked: boolean) => void }) {
  return (
    <input
      type="checkbox"
      className="tg-checkbox"
      aria-label={props.label}
      ref={(el) => {
        if (el) el.indeterminate = !!props.indeterminate
      }}
      checked={props.checked}
      onChange={(e) => props.onToggle(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
    />
  )
}
