/**
 * The query protocol the grid speaks: a request with filters, sort, grouping
 * and expanded groups, answered by cursor-paged pages of group and record items.
 * A backend implements it directly or through an adapter in its API client.
 */

export type Filter =
  | { field: string; operator: "CONTAINS"; value: string }
  | { field: string; operator: "IN"; values: Array<string> }
  | { field: string; operator: "EQUALS"; value: string | number | boolean }
  | {
      field: string;
      operator: "BETWEEN";
      from?: string | number;
      to?: string | number;
    };

/** A filter without its field; this is what lives in TanStack column filter state. */
export type FilterValue = Filter extends infer F
  ? F extends Filter
    ? Omit<F, "field">
    : never
  : never;

export interface QueryRequest {
  filters?: Array<Filter>;
  sort?: Array<string>;
  group_by?: Array<string>;
  expanded_groups?: Array<string>;
  limit?: number;
  cursor?: string;
}

export type GroupItem = {
  kind: "GROUP";
  group_path: string;
  depth: number;
  field: string;
  value: string | number | boolean;
  count: number;
};

export type RecordItem<T> = {
  kind: "RECORD";
  group_path: string;
  depth: number;
  record: T;
};
export type QueryItem<T> = GroupItem | RecordItem<T>;

export interface QueryResponse<T> {
  items: Array<QueryItem<T>>;
  self: string;
  next?: string;
  total_items: number;
  total_records: number;
}
