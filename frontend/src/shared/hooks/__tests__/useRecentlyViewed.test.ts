import { beforeEach, describe, expect, it } from 'vitest'
import { getRecentlyViewed, trackView } from '../useRecentlyViewed'
import type { RecentProduct } from '../useRecentlyViewed'

function makeProduct(id: number, name = `Produto ${id}`): RecentProduct {
  return {
    id,
    name,
    price: 100,
    imageUrl: '/img.jpg',
    manufacturer: 'Rodando',
    category: 'Transmissão',
    seoSlug: null,
    stock: 10,
    compareAtPrice: null,
  }
}

describe('useRecentlyViewed', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('retorna lista vazia quando não há histórico', () => {
    expect(getRecentlyViewed()).toEqual([])
  })

  it('registra um produto visualizado', () => {
    trackView(makeProduct(1))
    const result = getRecentlyViewed()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
  })

  it('insere novo produto na frente da lista', () => {
    trackView(makeProduct(1))
    trackView(makeProduct(2))
    const result = getRecentlyViewed()
    expect(result[0].id).toBe(2)
    expect(result[1].id).toBe(1)
  })

  it('deduplica e move para o início ao revisitar', () => {
    trackView(makeProduct(1))
    trackView(makeProduct(2))
    trackView(makeProduct(1))
    const result = getRecentlyViewed()
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe(1)
    expect(result[1].id).toBe(2)
  })

  it('limita a 8 produtos', () => {
    for (let i = 1; i <= 10; i++) trackView(makeProduct(i))
    const result = getRecentlyViewed()
    expect(result).toHaveLength(8)
    expect(result[0].id).toBe(10)
  })

  it('persiste os dados da produto (nome e preço)', () => {
    trackView(makeProduct(7, 'Kit Corrente'))
    expect(getRecentlyViewed()[0].name).toBe('Kit Corrente')
    expect(getRecentlyViewed()[0].price).toBe(100)
  })
})
