import { useState } from 'react'
import { functionalUpdate, type OnChangeFn } from '@tanstack/react-table'

/** Uses `value`/`onChange` when the parent controls the state, local state otherwise. */
export function useControllable<S>(value: S | undefined, onChange: ((next: S) => void) | undefined, initial: S): [S, OnChangeFn<S>] {
  const [local, setLocal] = useState(initial)
  const current = value ?? local
  const set: OnChangeFn<S> = (updater) => {
    const next = functionalUpdate(updater, current)
    if (onChange) onChange(next)
    if (value === undefined) setLocal(next)
  }
  return [current, set]
}
