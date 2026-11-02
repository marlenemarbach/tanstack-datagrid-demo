import type { GridColumn } from './features'

/** Sticky offset of a start-pinned column; passed as a prop so memoised cells update when an earlier pinned column is resized. */
export function pinOffset(column: GridColumn) {
  return column.getIsPinned() === 'start' ? column.getStart('start') : undefined
}

export function pinnedStyle(offset: number | undefined, isLast: boolean) {
  return offset !== undefined
    ? { className: isLast ? ' tg-pinned tg-pinned-last' : ' tg-pinned', style: { insetInlineStart: offset } }
    : { className: '', style: undefined }
}
