import type { ColumnFiltersState, ExpandedState, SortingState } from '@tanstack/react-table'
import type { Filter, FilterValue, QueryRequest } from '../core/types'

export interface GridQueryState {
  columnFilters: ColumnFiltersState
  sorting: SortingState
  grouping: Array<string>
  expanded: ExpandedState
}

/** Table state -> query protocol request. Pure; paging is added by the data source. */
export function toQueryRequest({ columnFilters, sorting, grouping, expanded }: GridQueryState): QueryRequest {
  return {
    filters: columnFilters.map((f) => ({ field: f.id, ...(f.value as FilterValue) }) as Filter),
    sort: sorting.map((s) => `${s.desc ? '-' : '+'}${s.id}`),
    group_by: grouping,
    expanded_groups: expanded === true ? [] : Object.keys(expanded).filter((k) => expanded[k]),
  }
}
