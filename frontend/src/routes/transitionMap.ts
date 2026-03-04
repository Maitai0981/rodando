import { matchPath } from 'react-router-dom'

export type RouteGroup = 'public' | 'owner' | 'other'

export type RouteMeta = {
  group: RouteGroup
  index: number
}

export type TransitionNavigationType = 'PUSH' | 'POP' | 'REPLACE'
export type TransitionDirection = -1 | 0 | 1

const ROUTE_FLOW: Array<{
  path: string
  group: Exclude<RouteGroup, 'other'>
  index: number
}> = [
  { path: '/owner/login', group: 'owner', index: 0 },
  { path: '/owner', group: 'owner', index: 1 },
  { path: '/owner/dashboard', group: 'owner', index: 2 },
  { path: '/owner/products', group: 'owner', index: 3 },
  { path: '/owner/orders', group: 'owner', index: 3 },
  { path: '/owner/settings', group: 'owner', index: 3 },
  { path: '/owner/products/new', group: 'owner', index: 4 },
  { path: '/owner/products/:id/edit', group: 'owner', index: 4 },
  { path: '/', group: 'public', index: 0 },
  { path: '/catalog', group: 'public', index: 1 },
  { path: '/produto/:idSlug', group: 'public', index: 2 },
  { path: '/cart', group: 'public', index: 3 },
  { path: '/checkout', group: 'public', index: 4 },
  { path: '/auth', group: 'public', index: 5 },
  { path: '/auth/signup', group: 'public', index: 6 },
  { path: '/account/profile', group: 'public', index: 7 },
  { path: '/orders', group: 'public', index: 8 },
  { path: '/orders/:id', group: 'public', index: 9 },
]

export function resolveRouteMeta(pathname: string): RouteMeta {
  for (const route of ROUTE_FLOW) {
    if (matchPath({ path: route.path, end: true }, pathname)) {
      return { group: route.group, index: route.index }
    }
  }

  return { group: 'other', index: 0 }
}

export function resolveTransitionDirection(
  prevPath: string,
  nextPath: string,
  navigationType: TransitionNavigationType,
): TransitionDirection {
  if (navigationType === 'REPLACE') {
    return 0
  }

  const prev = resolveRouteMeta(prevPath)
  const next = resolveRouteMeta(nextPath)

  if (prev.group !== next.group) {
    return 0
  }

  if (next.index > prev.index) {
    return 1
  }

  if (next.index < prev.index) {
    return -1
  }

  return 0
}

export function toDirectionLabel(direction: TransitionDirection): 'left' | 'right' | 'fade' {
  if (direction === 1) return 'left'
  if (direction === -1) return 'right'
  return 'fade'
}
