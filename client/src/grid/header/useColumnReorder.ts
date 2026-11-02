import { useState, type DragEvent } from 'react'

const COLUMN_DRAG_TYPE = 'application/x-grid-column'

export type DropTarget = { id: string; side: 'before' | 'after' }

/**
 * Column reordering with native drag and drop. The handlers are delegated:
 * spread them on the header row; header cells only carry `data-reorderable`
 * and `data-column-id`.
 */
export function useColumnReorder(columnIds: Array<string>, columnOrder: Array<string>, setColumnOrder: (order: Array<string>) => void) {
  const [dragColumn, setDragColumn] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  const endDrag = () => {
    setDragColumn(null)
    setDropTarget(null)
  }

  const headerAt = (e: DragEvent) => (e.target as HTMLElement).closest<HTMLElement>('[data-reorderable]')

  const onDragStart = (e: DragEvent<HTMLDivElement>) => {
    const id = headerAt(e)?.dataset.columnId
    if (!id) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData(COLUMN_DRAG_TYPE, id)
    setDragColumn(id)
  }

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    const th = headerAt(e)
    if (!dragColumn || !th) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const id = th.dataset.columnId!
    const rect = th.getBoundingClientRect()
    const side = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after'
    const next = id === dragColumn ? null : { id, side } as const
    setDropTarget((t) => (t?.id === next?.id && t?.side === next?.side ? t : next))
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (dragColumn && dropTarget) {
      // Full current order: listed ids first, the rest in definition order (as TanStack applies it).
      const order = [...new Set([...columnOrder.filter((id) => columnIds.includes(id)), ...columnIds])].filter((id) => id !== dragColumn)
      order.splice(order.indexOf(dropTarget.id) + (dropTarget.side === 'after' ? 1 : 0), 0, dragColumn)
      setColumnOrder(order)
    }
    endDrag()
  }

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget(null)
  }

  return { dragColumn, dropTarget, handlers: { onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd: endDrag } }
}
