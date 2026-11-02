import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { CellContext } from '@tanstack/react-table'
import type { Features, OptionDef } from '../core/features'
import type { QueryItem } from '../core/types'
import { renderValue } from './format'

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
