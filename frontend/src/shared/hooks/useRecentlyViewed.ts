import type { Product } from '../lib/api'

const KEY = 'rodando:recently-viewed'
const MAX = 8

export type RecentProduct = Pick<
  Product,
  'id' | 'name' | 'price' | 'imageUrl' | 'manufacturer' | 'category' | 'seoSlug' | 'stock' | 'compareAtPrice'
>

export function getRecentlyViewed(): RecentProduct[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as RecentProduct[]) : []
  } catch {
    return []
  }
}

export function trackView(product: RecentProduct): void {
  const existing = getRecentlyViewed().filter((p) => p.id !== product.id)
  existing.unshift(product)
  try {
    localStorage.setItem(KEY, JSON.stringify(existing.slice(0, MAX)))
  } catch {
    // quota exceeded — silently skip
  }
}
