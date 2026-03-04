import { routeImporters } from './AppRoutes'

type RoutePrefetchKey = keyof typeof routeImporters

const prefetchedChunks = new Set<RoutePrefetchKey>()

function resolvePrefetchKey(pathname: string): RoutePrefetchKey | null {
  const safe = String(pathname || '/').trim()
  if (!safe || safe === '/') return 'home'
  if (safe.startsWith('/catalog')) return 'catalog'
  if (safe.startsWith('/produto/')) return 'productDetails'
  if (safe.startsWith('/cart')) return 'cart'
  if (safe.startsWith('/checkout')) return 'checkout'
  if (safe.startsWith('/auth/signup')) return 'signUp'
  if (safe.startsWith('/auth')) return 'signIn'
  if (safe.startsWith('/account/profile')) return 'accountProfile'
  if (safe.startsWith('/orders/')) return 'orderDetails'
  if (safe.startsWith('/orders')) return 'orders'
  if (safe.startsWith('/owner/login')) return 'ownerSignIn'
  if (safe === '/owner') return 'ownerGate'
  if (safe.startsWith('/owner/dashboard')) return 'ownerDashboard'
  if (safe.startsWith('/owner/products/new')) return 'ownerProductForm'
  if (safe.startsWith('/owner/products/') && safe.endsWith('/edit')) return 'ownerProductForm'
  if (safe.startsWith('/owner/products')) return 'ownerProducts'
  if (safe.startsWith('/owner/settings')) return 'ownerSettings'
  if (safe.startsWith('/owner/orders')) return 'ownerOrders'
  return null
}

export function prefetchRouteChunk(pathname: string) {
  const key = resolvePrefetchKey(pathname)
  if (!key || prefetchedChunks.has(key)) return
  prefetchedChunks.add(key)
  void routeImporters[key]()
}

export function prefetchCriticalRoutes() {
  prefetchRouteChunk('/catalog')
  prefetchRouteChunk('/cart')
  prefetchRouteChunk('/checkout')
  prefetchRouteChunk('/produto/1-placeholder')
}

