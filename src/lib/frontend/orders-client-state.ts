import { Order } from '@/lib/domain/types'

export type OrderItemDraft = Partial<
  Pick<
    Order['items'][number],
    'qtyRequested' | 'uom' | 'color' | 'shortageAction' | 'itemCondition' | 'conditionTemplateName' | 'conditions'
  >
>

export type OrderDraft = Partial<Pick<Order, 'clientName' | 'dueDate' | 'volumeCount'>> & {
  items?: Record<string, OrderItemDraft>
}

export function applyOrderDraft(order: Order, draft?: OrderDraft): Order {
  if (!draft) return order

  const nextOrder: Order = {
    ...order,
    ...(draft.clientName !== undefined ? { clientName: draft.clientName } : {}),
    ...(draft.dueDate !== undefined ? { dueDate: draft.dueDate } : {}),
    ...(draft.volumeCount !== undefined ? { volumeCount: draft.volumeCount } : {}),
  }

  if (!draft.items) {
    return nextOrder
  }

  nextOrder.items = order.items.map((item) => {
    const itemDraft = draft.items?.[item.id]
    return itemDraft ? { ...item, ...itemDraft } : item
  })

  return nextOrder
}

export function pruneResolvedOrderDraft(serverOrder: Order, draft?: OrderDraft): OrderDraft | undefined {
  if (!draft) return undefined

  const nextDraft: OrderDraft = { ...draft }
  if (draft.clientName === serverOrder.clientName) delete nextDraft.clientName
  if (draft.dueDate === serverOrder.dueDate) delete nextDraft.dueDate
  if (draft.volumeCount === serverOrder.volumeCount) delete nextDraft.volumeCount

  if (draft.items) {
    const nextItemDrafts: Record<string, OrderItemDraft> = {}
    for (const [itemId, itemDraft] of Object.entries(draft.items)) {
      const serverItem = serverOrder.items.find((item) => item.id === itemId)
      if (!serverItem) {
        nextItemDrafts[itemId] = itemDraft
        continue
      }

      const nextItemDraft: OrderItemDraft = { ...itemDraft }
      if (itemDraft.qtyRequested === serverItem.qtyRequested) delete nextItemDraft.qtyRequested
      if (itemDraft.uom === serverItem.uom) delete nextItemDraft.uom
      if (itemDraft.color === serverItem.color) delete nextItemDraft.color
      if (itemDraft.shortageAction === serverItem.shortageAction) delete nextItemDraft.shortageAction
      if (itemDraft.itemCondition === serverItem.itemCondition) delete nextItemDraft.itemCondition
      if (itemDraft.conditionTemplateName === serverItem.conditionTemplateName) delete nextItemDraft.conditionTemplateName
      if (
        itemDraft.conditions !== undefined &&
        JSON.stringify(itemDraft.conditions) === JSON.stringify(serverItem.conditions ?? [])
      ) {
        delete nextItemDraft.conditions
      }

      if (Object.keys(nextItemDraft).length > 0) {
        nextItemDrafts[itemId] = nextItemDraft
      }
    }

    if (Object.keys(nextItemDrafts).length > 0) {
      nextDraft.items = nextItemDrafts
    } else {
      delete nextDraft.items
    }
  }

  return Object.keys(nextDraft).length > 0 ? nextDraft : undefined
}
