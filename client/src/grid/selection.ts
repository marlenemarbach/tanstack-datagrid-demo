/**
 * Hierarchical selection for server-side data.
 *
 * TanStack's row selection can only describe rows that are loaded. With
 * infinite scroll and collapsed server groups most rows never are, so the
 * selection is stored as decisions on scopes instead:
 *
 *   all              -> default for everything
 *   "status:OPEN"    -> group scope (overrides `all`)
 *   "status:OPEN#42" -> single record (overrides its groups)
 *
 * A record's state is the nearest explicit decision walking up its group path.
 * This descriptor is also what a bulk endpoint would receive.
 */

export interface SelectionState {
  all: boolean
  overrides: Record<string, boolean>
}

export const emptySelection: SelectionState = { all: false, overrides: {} }

export const recordKey = (groupPath: string, id: string) => `${groupPath}#${id}`

/** "a/b/c" -> ["a/b/c", "a/b", "a"] */
function scopes(groupPath: string): Array<string> {
  if (!groupPath) return []
  const out: Array<string> = []
  let path = groupPath
  for (;;) {
    out.push(path)
    const i = path.lastIndexOf('/')
    if (i < 0) return out
    path = path.slice(0, i)
  }
}

function inherited(state: SelectionState, groupPath: string): boolean {
  for (const scope of scopes(groupPath)) {
    const v = state.overrides[scope]
    if (v !== undefined) return v
  }
  return state.all
}

const parentOf = (path: string) => {
  const i = path.lastIndexOf('/')
  return i < 0 ? '' : path.slice(0, i)
}

const isWithin = (key: string, groupPath: string) =>
  key.startsWith(groupPath + '/') || key.startsWith(groupPath + '#')

export function isRecordSelected(state: SelectionState, groupPath: string, id: string) {
  return state.overrides[recordKey(groupPath, id)] ?? inherited(state, groupPath)
}

export function groupCheckState(state: SelectionState, groupPath: string) {
  const checked = inherited(state, groupPath)
  let indeterminate = false
  for (const key in state.overrides) {
    if (state.overrides[key] !== checked && isWithin(key, groupPath)) {
      indeterminate = true
      break
    }
  }
  return { checked: checked && !indeterminate, indeterminate }
}

export function allCheckState(state: SelectionState) {
  const indeterminate = Object.values(state.overrides).some((v) => v !== state.all)
  return { checked: state.all && !indeterminate, indeterminate }
}

/** Set a scope's decision and drop every decision nested inside it. */
export function setScope(state: SelectionState, scope: { groupPath: string; id?: string }, value: boolean): SelectionState {
  const key = scope.id === undefined ? scope.groupPath : recordKey(scope.groupPath, scope.id)
  const overrides: Record<string, boolean> = {}
  for (const k in state.overrides) {
    if (k === key || (scope.id === undefined && isWithin(k, key))) continue
    overrides[k] = state.overrides[k]!
  }
  const parentValue = scope.id === undefined ? inherited(state, parentOf(key)) : inherited(state, scope.groupPath)
  // Only store decisions that differ from what would be inherited anyway.
  if (parentValue !== value) overrides[key] = value
  return { all: state.all, overrides }
}

export function setAll(value: boolean): SelectionState {
  return { all: value, overrides: {} }
}

/** Exact count, using group sizes the server reported. */
export function countSelected(state: SelectionState, totalRecords: number, groupCounts: ReadonlyMap<string, number>) {
  let count = state.all ? totalRecords : 0
  const keys = Object.keys(state.overrides).sort((a, b) => depth(a) - depth(b))
  for (const key of keys) {
    const value = state.overrides[key]!
    const hash = key.indexOf('#')
    const parent = hash >= 0 ? key.slice(0, hash) : parentOf(key)
    if (inherited(state, parent) === value) continue
    const size = hash >= 0 ? 1 : (groupCounts.get(key) ?? 0)
    count += value ? size : -size
  }
  return count
}

const depth = (key: string) => key.split('/').length + (key.includes('#') ? 0.5 : 0)
