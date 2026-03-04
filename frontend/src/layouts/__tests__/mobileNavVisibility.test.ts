import { describe, expect, it } from 'vitest'
import { shouldShowMobileBottomNav } from '../mobileNavVisibility'

describe('shouldShowMobileBottomNav', () => {
  it('exibe em rotas publicas de comercio e conta', () => {
    expect(shouldShowMobileBottomNav('/')).toBe(true)
    expect(shouldShowMobileBottomNav('/catalog')).toBe(true)
    expect(shouldShowMobileBottomNav('/produto/10-corrente')).toBe(true)
    expect(shouldShowMobileBottomNav('/cart')).toBe(true)
    expect(shouldShowMobileBottomNav('/checkout')).toBe(true)
    expect(shouldShowMobileBottomNav('/orders')).toBe(true)
    expect(shouldShowMobileBottomNav('/orders/123')).toBe(true)
    expect(shouldShowMobileBottomNav('/account/profile')).toBe(true)
  })

  it('oculta em auth e owner', () => {
    expect(shouldShowMobileBottomNav('/auth')).toBe(false)
    expect(shouldShowMobileBottomNav('/auth/signup')).toBe(false)
    expect(shouldShowMobileBottomNav('/owner/login')).toBe(false)
    expect(shouldShowMobileBottomNav('/owner/dashboard')).toBe(false)
  })

  it('normaliza trailing slash', () => {
    expect(shouldShowMobileBottomNav('/catalog/')).toBe(true)
    expect(shouldShowMobileBottomNav('/auth/')).toBe(false)
  })
})

