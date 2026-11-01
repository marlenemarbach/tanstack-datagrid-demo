import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import type { FilterValue } from "./api/orders";
import { groupableColumns, orderColumns } from "./columns";

/**
 * URL codec for the grid's query settings. Each setting is one flat param, and
 * parsing never throws: hand-edited or stale links drop what they cannot use.
 *
 *   ?group=status,region&sort=-created_at,customer_name
 *   &cols=status,order_id
 *   &filters={"status":{"operator":"IN","values":["OPEN"]}}
 *   &zoom=1
 *
 * `filters` is plain JSON, which is also what TanStack Router's default search
 * serializer writes, so links stay valid if the app moves to the router.
 */

const columnIds = new Set(orderColumns.map((c) => c.id));
const groupIds = new Set(groupableColumns.map((c) => c.id));

const list = (raw: string | null) => (raw ? raw.split(",").filter(Boolean) : []);

export const parseGroup = (raw: string | null) =>
  [...new Set(list(raw))].filter((id) => groupIds.has(id));

export const serializeGroup = (ids: Array<string>) => ids.join(",");

/**
 * Column order. Unlisted columns follow in their default order (as in
 * TanStack's columnOrder state), so links survive columns being added.
 */
export const parseColumnOrder = (raw: string | null) =>
  [...new Set(list(raw))].filter((id) => columnIds.has(id));

/** Shortest prefix of `order` that still yields `order` once unlisted columns are appended. */
export function serializeColumnOrder(order: Array<string>) {
  const defaults = orderColumns.map((c) => c.id!);
  for (let k = 0; k <= order.length; k++) {
    const listed = new Set(order.slice(0, k));
    const rest = defaults.filter((id) => !listed.has(id));
    if (rest.every((id, i) => order[k + i] === id)) return order.slice(0, k).join(",");
  }
  return order.join(",");
}

export function parseSort(raw: string | null): SortingState {
  const seen = new Set<string>();
  return list(raw).flatMap((token) => {
    const desc = token.startsWith("-");
    const id = desc ? token.slice(1) : token;
    if (!columnIds.has(id) || seen.has(id)) return [];
    seen.add(id);
    return [{ id, desc }];
  });
}

export const serializeSort = (sorting: SortingState) =>
  sorting.map((s) => (s.desc ? `-${s.id}` : s.id)).join(",");

const isScalar = (v: unknown) =>
  typeof v === "string" || typeof v === "number";

function isFilterValue(v: unknown): v is FilterValue {
  if (typeof v !== "object" || v === null) return false;
  const f = v as Record<string, unknown>;
  switch (f.operator) {
    case "CONTAINS":
      return typeof f.value === "string";
    case "IN":
      return Array.isArray(f.values) && f.values.every((x) => typeof x === "string");
    case "EQUALS":
      return isScalar(f.value) || typeof f.value === "boolean";
    case "BETWEEN":
      return (
        (f.from !== undefined || f.to !== undefined) &&
        (f.from === undefined || isScalar(f.from)) &&
        (f.to === undefined || isScalar(f.to))
      );
    default:
      return false;
  }
}

export function parseFilters(raw: string | null): ColumnFiltersState {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return [];
  return Object.entries(parsed)
    .filter(([id, value]) => columnIds.has(id) && isFilterValue(value))
    .map(([id, value]) => ({ id, value }));
}

export const serializeFilters = (filters: ColumnFiltersState) =>
  filters.length
    ? JSON.stringify(Object.fromEntries(filters.map((f) => [f.id, f.value])))
    : "";

/** Row height steps; `zoom` is an offset from the middle (default) step. */
export const rowHeights = [28, 36, 44] as const;
const defaultZoom = 1;

export const parseZoom = (raw: string | null) => {
  const step = defaultZoom + Number(raw ?? 0);
  return Number.isInteger(step) && step >= 0 && step < rowHeights.length ? step : defaultZoom;
};

export const serializeZoom = (step: number) =>
  step === defaultZoom ? "" : String(step - defaultZoom);
