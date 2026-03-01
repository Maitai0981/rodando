import { describe, expect, it, vi, beforeEach } from 'vitest'
import { api, ApiError } from '../api'

describe('api contracts', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('listPublicProducts monta query e retorna items+meta', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [{ id: 1, name: 'Produto', sku: 'A1', manufacturer: 'QA', category: 'Teste', bikeModel: 'CG', price: 10, stock: 2, imageUrl: '/img', description: 'ok', isActive: 1, createdAt: '', updatedAt: '' }],
          meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    const data = await api.listPublicProducts({
      q: 'pneu',
      category: 'Pneu',
      manufacturer: 'Factory QA',
      inStock: true,
      sort: 'best-sellers',
      page: 1,
      pageSize: 12,
      minPrice: 10,
      maxPrice: 200,
      onlyWithImage: true,
    })

    expect(data.meta.total).toBe(1)
    expect(data.items).toHaveLength(1)

    const calledUrl = String(fetchMock.mock.calls[0]?.[0])
    expect(calledUrl).toContain('/api/products?')
    expect(calledUrl).toContain('manufacturer=Factory+QA')
    expect(calledUrl).toContain('inStock=true')
  })

  it('propaga ApiError quando backend falha', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Falha simulada' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(api.listCatalogHighlights()).rejects.toBeInstanceOf(ApiError)
  })

  it('signUp envia CEP e endereco no payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'ok',
          user: {
            id: 1,
            name: 'Cliente QA',
            email: 'cliente.qa@rodando.local',
            role: 'customer',
            cep: '01001000',
            addressStreet: 'Praca da Se',
            addressCity: 'Sao Paulo',
            addressState: 'SP',
            createdAt: new Date().toISOString(),
          },
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    const result = await api.signUp({
      name: 'Cliente QA',
      email: 'cliente.qa@rodando.local',
      password: '123456',
      cep: '01001-000',
      addressStreet: 'Praca da Se',
      addressCity: 'Sao Paulo',
      addressState: 'SP',
    })

    expect(result.user.cep).toBe('01001000')
    expect(result.user.addressCity).toBe('Sao Paulo')

    const options = fetchMock.mock.calls[0]?.[1]
    const body = JSON.parse(String(options?.body || '{}'))
    expect(body.cep).toBe('01001-000')
    expect(body.addressStreet).toBe('Praca da Se')
    expect(body.addressCity).toBe('Sao Paulo')
    expect(body.addressState).toBe('SP')
  })

  it('uploadOwnerImage envia multipart e retorna URL publica', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          item: {
            id: 7,
            ownerUserId: 1,
            storageKey: '/uploads/test-image.jpg',
            publicUrl: 'http://localhost:4000/uploads/test-image.jpg',
            originalName: 'test-image.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 1024,
            createdAt: new Date().toISOString(),
          },
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    const file = new File([new Blob(['fake'])], 'test-image.jpg', { type: 'image/jpeg' })
    const response = await api.uploadOwnerImage(file)

    expect(response.item.publicUrl).toContain('/uploads/test-image.jpg')
    const options = fetchMock.mock.calls[0]?.[1]
    expect(options?.method).toBe('POST')
    expect(options?.body).toBeInstanceOf(FormData)
  })
})
