/**
 * Datetime filter bounds. The server compares UTC ISO strings; the UI shows and
 * accepts local time at minute precision. An upper bound covers its whole minute.
 * Date-only bounds (`YYYY-MM-DD`) are left as they are.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** Local `YYYY-MM-DD HH:mm` (or `T` separator) -> UTC ISO, or undefined if invalid. */
export function localToIso(local: string, edge: 'start' | 'end'): string | undefined {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})$/.exec(local.trim())
  if (!m) return undefined
  const [y, mo, d, h, mi] = m.slice(1).map(Number) as [number, number, number, number, number]
  const end = edge === 'end'
  const date = new Date(y, mo - 1, d, h, mi, end ? 59 : 0, end ? 999 : 0)
  // Rejects overflow such as Feb 30 or 25:00, which Date would silently roll over.
  if (date.getMonth() !== mo - 1 || date.getDate() !== d || date.getHours() !== h || date.getMinutes() !== mi) return undefined
  return date.toISOString()
}

/** UTC ISO -> local `YYYY-MM-DDTHH:mm`; date-only strings pass through. */
export function isoToLocal(value: string): string {
  if (!value.includes('T')) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
