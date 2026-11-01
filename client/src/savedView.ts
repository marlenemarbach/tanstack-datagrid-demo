import { setUrlParams } from "./urlState";

/**
 * The table configuration saved to localStorage: the URL params that describe
 * the grid (grouping, sorting, filters, column order, row zoom), stored as raw strings.
 * App settings (borders, stripes, theme, edit mode) are not part of it.
 */

const STORAGE_KEY = "orders-table-view";
export const viewKeys = ["group", "sort", "filters", "cols", "zoom"] as const;
export type View = Record<(typeof viewKeys)[number], string>;

export const emptyView: View = { group: "", sort: "", filters: "", cols: "", zoom: "" };

export function viewFromParams(params: URLSearchParams): View {
  const view = { ...emptyView };
  for (const key of viewKeys) view[key] = params.get(key) ?? "";
  return view;
}

export const sameView = (a: View, b: View) => viewKeys.every((k) => a[k] === b[k]);

// Storage can be unavailable (private mode, blocked site data): degrade to no saved view.
export function loadView(): View | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<View>;
    const view = { ...emptyView };
    for (const key of viewKeys) if (typeof parsed[key] === "string") view[key] = parsed[key];
    return view;
  } catch {
    return null;
  }
}

export function saveView(view: View) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(view));
  } catch {
    // Not persisted; the URL still holds the view.
  }
}

export function clearView() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** On startup, a URL without table params opens the saved view; a shared link wins. */
export function restoreSavedView() {
  const params = new URLSearchParams(window.location.search);
  if (viewKeys.some((k) => params.has(k))) return;
  const saved = loadView();
  if (saved) setUrlParams(saved);
}
