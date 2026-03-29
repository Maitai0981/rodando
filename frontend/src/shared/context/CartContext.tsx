import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { api, ApiError, type BagItem, type Product } from '../lib/api'
import { useAuth } from './AuthContext'

type CartContextValue = {
  items: BagItem[]
  itemCount: number
  total: number
  loading: boolean
  addProduct: (product: Product, quantity?: number) => Promise<void>
  updateQty: (productId: number, quantity: number) => Promise<{ truncated: boolean; effectiveQuantity: number }>
  removeItem: (productId: number) => Promise<void>
  clear: () => Promise<void>
  refresh: () => Promise<void>
}

const LEGACY_STORAGE_KEY = 'rodando_guest_bag_v1'

const CartContext = createContext<CartContextValue | null>(null)

function parseLegacyGuestBag(): BagItem[] {
  try {
    if (!window.localStorage || typeof window.localStorage.getItem !== 'function') return []
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => typeof item === 'object' && item !== null)
      .map((item) => ({
        productId: Number((item as Partial<BagItem>).productId || 0),
        quantity: Math.max(1, Number((item as Partial<BagItem>).quantity || 1)),
        name: String((item as Partial<BagItem>).name || ''),
        sku: String((item as Partial<BagItem>).sku || ''),
        manufacturer: String((item as Partial<BagItem>).manufacturer || ''),
        category: String((item as Partial<BagItem>).category || ''),
        bikeModel: String((item as Partial<BagItem>).bikeModel || ''),
        price: Number((item as Partial<BagItem>).price || 0),
        stock: Math.max(0, Number((item as Partial<BagItem>).stock || 0)),
        imageUrl: String((item as Partial<BagItem>).imageUrl || ''),
        description: String((item as Partial<BagItem>).description || ''),
        isActive: Boolean((item as Record<string, unknown>).isActive) && (item as Record<string, unknown>).isActive !== 0,
      }))
      .filter((item) => item.productId > 0 && item.quantity > 0)
  } catch {
    return []
  }
}

function clearLegacyGuestBag() {
  if (!window.localStorage || typeof window.localStorage.removeItem !== 'function') return
  window.localStorage.removeItem(LEGACY_STORAGE_KEY)
}

export function CartProvider({ children }: PropsWithChildren) {
  const { status } = useAuth()
  const [items, setItems] = useState<BagItem[]>([])
  const [loading, setLoading] = useState(false)
  const migratedLegacyRef = useRef(false)
  // Contador de geração: garante que apenas a resposta da chamada mais recente
  // atualiza o estado, descartando respostas de chamadas concorrentes antigas.
  const refreshGenRef = useRef(0)

  const migrateLegacyGuestBagIfNeeded = useCallback(async () => {
    if (migratedLegacyRef.current) return
    migratedLegacyRef.current = true

    const legacyItems = parseLegacyGuestBag()
    if (legacyItems.length === 0) {
      clearLegacyGuestBag()
      return
    }

    for (const legacyItem of legacyItems) {
      try {
        await api.addBagItem({ productId: legacyItem.productId, quantity: legacyItem.quantity })
      } catch {
        // Best-effort migration: ignore invalid/removed products and keep going.
      }
    }

    clearLegacyGuestBag()
  }, [])

  const refresh = useCallback(async () => {
    if (status === 'loading') return

    const gen = ++refreshGenRef.current
    setLoading(true)
    try {
      await migrateLegacyGuestBagIfNeeded()
      const result = await api.getBag()
      // Descarta a resposta se uma chamada mais nova já foi iniciada.
      if (gen !== refreshGenRef.current) return
      startTransition(() => setItems(result.items))
    } catch (err) {
      if (gen !== refreshGenRef.current) return
      if (err instanceof ApiError && err.status === 401) {
        startTransition(() => setItems([]))
        return
      }
      throw err
    } finally {
      if (gen === refreshGenRef.current) {
        setLoading(false)
      }
    }
  }, [migrateLegacyGuestBagIfNeeded, status])

  useEffect(() => {
    void refresh().catch(() => undefined)
  }, [refresh])

  const addProduct = useCallback(async (product: Product, quantity = 1) => {
    const nextQuantity = Math.min(quantity, Number(product.stock || 0))
    if (nextQuantity <= 0) return

    const result = await api.addBagItem({ productId: product.id, quantity: nextQuantity })
    startTransition(() => setItems(result.items))
  }, [])

  const updateQty = useCallback(async (productId: number, quantity: number) => {
    const result = await api.updateBagItem(productId, quantity)
    startTransition(() => setItems(result.items))
    const updatedItem = result.items.find((i) => i.productId === productId)
    const effectiveQuantity = updatedItem ? Number(updatedItem.quantity) : quantity
    return { truncated: effectiveQuantity < quantity, effectiveQuantity }
  }, [])

  const removeItem = useCallback(async (productId: number) => {
    await api.removeBagItem(productId)
    startTransition(() => setItems((prev) => prev.filter((item) => item.productId !== productId)))
  }, [])

  const clear = useCallback(async () => {
    await api.clearBag()
    startTransition(() => setItems([]))
  }, [])

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    [items],
  )
  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [items],
  )

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount,
    total,
    loading,
    addProduct,
    updateQty,
    removeItem,
    clear,
    refresh,
  }), [addProduct, clear, itemCount, items, loading, refresh, removeItem, total, updateQty])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
