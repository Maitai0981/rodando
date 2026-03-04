import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import HomePage from '../HomePage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { api } from '../../lib/api'

vi.mock('../../layouts/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}))

describe('HomePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  function mockWithEmptyData() {
    vi.spyOn(api, 'listCatalogHighlights').mockResolvedValue({ items: [] })
    vi.spyOn(api, 'listPublicProducts').mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 1, total: 0, totalPages: 0 },
    })
    vi.spyOn(api, 'listComments').mockResolvedValue({
      items: [],
      summary: { averageRating: 0, totalReviews: 0 },
    })
  }

  function createHighlight(id: number) {
    return {
      id,
      name: `Pastilha Premium ${id}`,
      sku: `PP-${id}`,
      manufacturer: 'QA',
      category: 'Freio',
      bikeModel: 'CG',
      price: 79.9 + id,
      stock: 6,
      imageUrl: '/img',
      description: 'desc',
      isActive: 1,
      createdAt: '',
      updatedAt: '',
      discountPercent: 10,
    }
  }

  function mockViewportWidth(width: number) {
    const originalMatchMedia = window.matchMedia
    const matchMediaMock = vi.fn().mockImplementation((query: string) => {
      const minWidthMatch = /min-width:\s*(\d+)px/i.exec(query)
      const minWidth = minWidthMatch ? Number(minWidthMatch[1]) : 0
      const matches = width >= minWidth

      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }
    })

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: matchMediaMock,
    })

    return () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: originalMatchMedia,
      })
    }
  }

  it('renderiza hero e dados reais de destaque/comentario', async () => {
    vi.spyOn(api, 'listCatalogHighlights').mockResolvedValue({
      items: [
        {
          id: 1,
          name: 'Pastilha Premium',
          sku: 'PP1',
          manufacturer: 'QA',
          category: 'Freio',
          bikeModel: 'CG',
          price: 79.9,
          stock: 3,
          imageUrl: '/img',
          description: 'desc',
          isActive: 1,
          createdAt: '',
          updatedAt: '',
          discountPercent: 10,
        },
      ],
    })

    vi.spyOn(api, 'listPublicProducts').mockResolvedValue({
      items: [
        {
          id: 1,
          name: 'Pastilha Premium',
          sku: 'PP1',
          manufacturer: 'QA',
          category: 'Freio',
          bikeModel: 'CG',
          price: 79.9,
          stock: 3,
          imageUrl: '/img',
          description: 'desc',
          isActive: 1,
          createdAt: '',
          updatedAt: '',
        },
      ],
      meta: { page: 1, pageSize: 1, total: 1, totalPages: 1 },
    })

    vi.spyOn(api, 'listComments').mockResolvedValue({
      items: [
        {
          id: 1,
          userId: 1,
          productId: 1,
          authorName: 'Cliente QA',
          message: 'Atendimento excelente.',
          rating: 5,
          productName: 'Pastilha Premium',
          productImageUrl: '/img',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      summary: { averageRating: 4.8, totalReviews: 127 },
    })

    renderWithProviders(<HomePage />)

    expect(screen.getByTestId('home-hero-section')).toBeInTheDocument()
    expect(screen.getByTestId('home-catalog-cta')).toBeInTheDocument()

    await waitFor(() => expect(screen.getByText('Pastilha Premium')).toBeInTheDocument())
    expect(screen.getAllByText(/4.8/).length).toBeGreaterThan(0)
  })

  it('renderiza estados vazios compactos com CTAs de acao', async () => {
    mockWithEmptyData()

    renderWithProviders(<HomePage />)

    await waitFor(() => expect(screen.getByTestId('home-highlights-empty-state')).toBeInTheDocument())
    expect(screen.getByTestId('home-categories-empty-state')).toBeInTheDocument()
    expect(screen.getByTestId('home-reviews-empty-state')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver catálogo geral' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Avaliar no catálogo' })).toBeInTheDocument()
  })

  it('mantem secao de loja fisica com imagem e endereco visiveis', async () => {
    mockWithEmptyData()

    renderWithProviders(<HomePage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Loja física e atendimento comercial' })).toBeInTheDocument())
    expect(screen.getByAltText('Foto da loja física Rodando Moto Center')).toBeInTheDocument()
    expect(screen.getByText('Av. Brasil, 8708 - Cascavel - PR')).toBeInTheDocument()
  })

  it('limita destaques para uma unica linha conforme breakpoint ativo', async () => {
    vi.spyOn(api, 'listCatalogHighlights').mockResolvedValue({
      items: [createHighlight(1), createHighlight(2), createHighlight(3), createHighlight(4), createHighlight(5), createHighlight(6)],
    })
    vi.spyOn(api, 'listPublicProducts').mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 120, total: 0, totalPages: 0 },
    })
    vi.spyOn(api, 'listComments').mockResolvedValue({
      items: [],
      summary: { averageRating: 0, totalReviews: 0 },
    })

    const restoreViewport = mockViewportWidth(1536)

    try {
      renderWithProviders(<HomePage />)
      await waitFor(() => expect(screen.getAllByTestId('home-highlight-card')).toHaveLength(4))
    } finally {
      restoreViewport()
    }
  })

  it('seta do hero rola para a proxima secao', async () => {
    mockWithEmptyData()
    const scrollSpy = vi.fn()
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollSpy,
    })

    renderWithProviders(<HomePage />)

    await waitFor(() => expect(screen.getByTestId('home-next-section-trigger')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /proxima secao/i })).toBeInTheDocument()
    screen.getByTestId('home-next-section-trigger').click()
    expect(scrollSpy).toHaveBeenCalled()
  })
})
