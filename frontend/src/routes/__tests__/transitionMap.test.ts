import { describe, expect, it } from 'vitest'
import { resolveRouteMeta, resolveTransitionDirection } from '../transitionMap'

describe('transitionMap', () => {
  it('resolve metadados por rota dinamica owner edit', () => {
    expect(resolveRouteMeta('/owner/products/42/edit')).toEqual({ group: 'owner', index: 4 })
  })

  it('publico avancando deve ir para esquerda', () => {
    expect(resolveTransitionDirection('/', '/catalog', 'PUSH')).toBe(1)
    expect(resolveTransitionDirection('/auth', '/auth/signup', 'PUSH')).toBe(1)
  })

  it('publico voltando deve ir para direita', () => {
    expect(resolveTransitionDirection('/catalog', '/', 'POP')).toBe(-1)
  })

  it('owner avancando deve ir para esquerda', () => {
    expect(resolveTransitionDirection('/owner/dashboard', '/owner/products', 'PUSH')).toBe(1)
  })

  it('owner voltando deve ir para direita', () => {
    expect(resolveTransitionDirection('/owner/products/new', '/owner/products', 'POP')).toBe(-1)
  })

  it('troca de contexto deve usar fade', () => {
    expect(resolveTransitionDirection('/catalog', '/owner/login', 'PUSH')).toBe(0)
  })

  it('replace deve usar fade', () => {
    expect(resolveTransitionDirection('/owner', '/owner/dashboard', 'REPLACE')).toBe(0)
  })

  it('mesmo indice deve usar fade', () => {
    expect(resolveTransitionDirection('/owner/products/new', '/owner/products/10/edit', 'PUSH')).toBe(0)
    expect(resolveTransitionDirection('/catalog', '/catalog', 'PUSH')).toBe(0)
  })
})

