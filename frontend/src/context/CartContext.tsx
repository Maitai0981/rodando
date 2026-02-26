import { createContext, startTransition, useContext, useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { api, ApiError, type BagItem, type Product } from '../lib/api'
import { useAuth } from './AuthContext'

type CartContextValue = {
  items: BagItem[]
  itemCount: number
  total: number
  loading: boolean
  addProduct: (product: Product, quantity?: number) => Promise<void>
  updateQty: (productId: number, quantity: number) => Promise<void>
  removeItem: (productId: number) => Promise<void>
  clear: () => Promise<void>
  refresh: () => Promise<void>
}

const STORAGE_KEY = 'rodando_guest_bag_v1'

const CartContext = createContext<CartContextValue | null>(null)

function parseStoredGuestBag(): BagItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isBagItemLike).map(normalizeBagItem)
  } catch {
    return []
  }
}

function isBagItemLike(value: unknown): value is Partial<BagItem> {
  return typeof value === 'object' && value !== null && 'productId' in value && 'quantity' in value
}

function normalizeBagItem(item: Partial<BagItem>): BagItem {
  return {
    productId: Number(item.productId || 0),
    quantity: Math.max(1, Number(item.quantity || 1)),
    name: String(item.name || ''),
    sku: String(item.sku || ''),
    manufacturer: String(item.manufacturer || ''),
    category: String(item.category || ''),
    bikeModel: String(item.bikeModel || ''),
    price: Number(item.price || 0),
    stock: Math.max(0, Number(item.stock || 0)),
    imageUrl: String(item.imageUrl || ''),
    description: String(item.description || ''),
    isActive: item.isActive === false || item.isActive === 0 ? 0 : 1,
  }
}

function saveGuestBag(items: BagItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function CartProvider({ children }: PropsWithChildren) {
  const { user, status } = useAuth()
  const [items, setItems] = useState<BagItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'anonymous') {
      startTransition(() => {
        setItems(parseStoredGuestBag())
      })
      return
    }

    let active = true
    void hydrateServerBag().catch(() => {
      if (!active) return
      startTransition(() => setItems([]))
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user?.id])

  async function hydrateServerBag() {
    setLoading(true)
    try {
      const guestItems = parseStoredGuestBag()
      if (guestItems.length > 0) {
        saveGuestBag([])
        for (const guestItem of guestItems) {
          if (guestItem.productId > 0 && guestItem.quantity > 0) {
            try {
              await api.addBagItem({ productId: guestItem.productId, quantity: guestItem.quantity })
            } catch {
              // Ignore merge conflicts per item and continue syncing the rest.
            }
          }
        }
      }

      const result = await api.getBag()
      startTransition(() => setItems(result.items))
    } finally {
      setLoading(false)
    }
  }

  async function refresh() {
    if (status === 'loading') return
    if (status === 'anonymous') {
      startTransition(() => setItems(parseStoredGuestBag()))
      return
    }
    setLoading(true)
    try {
      const result = await api.getBag()
      startTransition(() => setItems(result.items))
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        startTransition(() => setItems(parseStoredGuestBag()))
        return
      }
      throw err
    } finally {
      setLoading(false)
    }
  }

  async function addProduct(product: Product, quantity = 1) {
    if (status === 'authenticated') {
      const result = await api.addBagItem({ productId: product.id, quantity })
      startTransition(() => setItems(result.items))
      return
    }

    const current = parseStoredGuestBag()
    const existing = current.find((item) => item.productId === product.id)
    const nextQty = Math.min(Number(product.stock || 0), Number(existing?.quantity || 0) + quantity)
    if (nextQty <= 0) return

    const nextItems = existing
      ? current.map((item) => (
        item.productId === product.id
          ? { ...item, quantity: nextQty, stock: product.stock, imageUrl: product.imageUrl || item.imageUrl || '' }
          : item
      ))
      : [
          {
            productId: product.id,
            quantity: Math.min(quantity, product.stock),
            name: product.name,
            sku: product.sku,
            manufacturer: product.manufacturer,
            category: product.category,
            bikeModel: product.bikeModel,
            price: product.price,
            stock: product.stock,
            imageUrl: product.imageUrl || '',
            description: product.description,
            isActive: product.isActive,
          },
          ...current,
        ]
    saveGuestBag(nextItems)
    startTransition(() => setItems(nextItems))
  }

  async function updateQty(productId: number, quantity: number) {
    if (status === 'authenticated') {
      const result = await api.updateBagItem(productId, quantity)
      startTransition(() => setItems(result.items))
      return
    }

    const current = parseStoredGuestBag()
    const nextItems = quantity <= 0
      ? current.filter((item) => item.productId !== productId)
      : current.map((item) => (
        item.productId === productId
          ? { ...item, quantity: Math.min(Math.max(1, quantity), Math.max(1, item.stock || quantity)) }
          : item
      ))
    saveGuestBag(nextItems)
    startTransition(() => setItems(nextItems))
  }

  async function removeItem(productId: number) {
    if (status === 'authenticated') {
      await api.removeBagItem(productId)
      startTransition(() => setItems((prev) => prev.filter((item) => item.productId !== productId)))
      return
    }

    const nextItems = parseStoredGuestBag().filter((item) => item.productId !== productId)
    saveGuestBag(nextItems)
    startTransition(() => setItems(nextItems))
  }

  async function clear() {
    if (status === 'authenticated') {
      await api.clearBag()
    } else {
      saveGuestBag([])
    }
    startTransition(() => setItems([]))
  }

  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const total = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0)

  const value: CartContextValue = {
    items,
    itemCount,
    total,
    loading,
    addProduct,
    updateQty,
    removeItem,
    clear,
    refresh,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
