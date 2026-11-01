import { useSyncExternalStore } from 'react'

/**
 * The only module that reads or writes the browser URL. With a router, swap
 * this for the router's search-param hook and navigate({ search, replace: true }).
 */

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('popstate', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('popstate', listener)
  }
}

const getSearch = () => window.location.search

/** The raw `?query` string; stable as long as the URL does not change. */
export function useUrlSearch(): string {
  return useSyncExternalStore(subscribe, getSearch, () => '')
}

/**
 * Merges `patch` into the current query string. Empty values remove the key.
 * Replaces the history entry: settings changes should not fill the back stack.
 */
export function setUrlParams(patch: Record<string, string | undefined>) {
  const params = new URLSearchParams(window.location.search)
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value)
    else params.delete(key)
  }
  const query = params.toString()
  const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
  if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`) return
  // Keep history.state: routers store their own keys there.
  window.history.replaceState(window.history.state, '', url)
  notify()
}
