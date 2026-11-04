import { createContext, use, useSyncExternalStore } from 'react'
import type { GridModel, GridStatus } from './model/useGridModel'

/**
 * Three contexts, split by how often they change, so each part only
 * re-renders for what it reads:
 *
 * - model:  state and data changes; read by the viewport only.
 * - status: counts (load, selection); read by the status bar.
 * - stats:  a stable store the viewport writes per scroll frame (rendered columns).
 */
export const GridModelContext = createContext<GridModel | null>(null)
export const GridStatusContext = createContext<GridStatus | null>(null)
export const GridStatsContext = createContext<ValueStore<number> | null>(null)

function required<V>(value: V | null, part: string): V {
  if (value === null) throw new Error(`<DataGrid.${part}> must be rendered inside <DataGrid.Root>`)
  return value
}

export const useGridModelContext = (part: string) => required(use(GridModelContext), part)

/** Status counts of the surrounding `DataGrid.Root`, e.g. for a custom status bar. */
export const useGridStatus = () => required(use(GridStatusContext), 'StatusBar')

/** Number of center columns the viewport currently renders (re-renders only when it changes). */
export function useRenderedColumnCount() {
  const store = required(use(GridStatsContext), 'StatusBar')
  return useSyncExternalStore(store.subscribe, store.get)
}

export interface ValueStore<V> {
  get: () => V
  /** No-op (no notification) when the value is unchanged. */
  set: (value: V) => void
  subscribe: (listener: () => void) => () => void
}

export function createValueStore<V>(initial: V): ValueStore<V> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return
      value = next
      listeners.forEach((l) => l())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
