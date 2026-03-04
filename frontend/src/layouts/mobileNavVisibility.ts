const NAV_VISIBLE_EXACT_ROUTES = new Set([
  '/',
  '/catalog',
  '/cart',
  '/checkout',
  '/orders',
  '/account/profile',
])

const NAV_VISIBLE_PREFIX_ROUTES = ['/produto/', '/orders/']

function normalizePathname(pathname: string) {
  if (!pathname) return '/'
  if (pathname === '/') return pathname
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

export function shouldShowMobileBottomNav(pathname: string) {
  const normalizedPathname = normalizePathname(pathname)

  if (normalizedPathname.startsWith('/auth') || normalizedPathname.startsWith('/owner')) {
    return false
  }

  if (NAV_VISIBLE_EXACT_ROUTES.has(normalizedPathname)) {
    return true
  }

  return NAV_VISIBLE_PREFIX_ROUTES.some((prefix) => normalizedPathname.startsWith(prefix))
}

