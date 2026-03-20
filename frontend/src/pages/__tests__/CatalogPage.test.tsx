import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Route, Routes, useLocation } from 'react-router-dom'
import CatalogPage from '../CatalogPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { api, buildProductUrl, type Product } from '../../shared/lib/api'

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 10,
    name: 'Produto base',
    sku: 'SKU-10',
    manufacturer: 'Rodando',
    category: 'Transmissão',
    bikeModel: 'CG',
    price: 49.9,
    stock: 5,
    imageUrl: '/img',
    description: 'desc',
    isActive: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

vi.mock('../../shared/context/CartContext', () => ({
  useCart: () => ({ addProduct: vi.fn() }),
}))

function LocationReadout() {
  const location = useLocation()
  return <div data-testid="catalog-location">{location.search}</div>
}

describe('CatalogPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'listPublicProducts').mockImplementation(async (params = {}) => ({
      items: [makeProduct({ name: params.q ? `Produto ${params.q}` : 'Produto base' })],
      meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('inicializa busca a partir de q na URL e sincroniza ao digitar', async () => {
    renderWithProviders(
      <Routes>
        <Route
          path="/catalog"
          element={
            <>
              <CatalogPage />
              <LocationReadout />
            </>
          }
        />
      </Routes>,
      { initialEntries: ['/catalog?q=capacete'] },
    )

    const searchInput = await screen.findByTestId('catalog-search-input')
    expect(searchInput).toHaveValue('capacete')
    await waitFor(() => expect(api.listPublicProducts).toHaveBeenCalledWith(expect.objectContaining({ q: 'capacete' })))

    fireEvent.change(searchInput, { target: { value: 'corrente' } })
    await waitFor(() => expect(screen.getByTestId('catalog-location')).toHaveTextContent('?q=corrente'))
    await waitFor(() => expect(api.listPublicProducts).toHaveBeenCalledWith(expect.objectContaining({ q: 'corrente' })))

    fireEvent.change(searchInput, { target: { value: '' } })
    await waitFor(() => expect(screen.getByTestId('catalog-location')).toHaveTextContent(''))
  })

  it('exibe atalho para ver o produto no card', async () => {
    renderWithProviders(<CatalogPage />, { initialEntries: ['/catalog'] })

    const productLink = await screen.findByRole('link', { name: 'Ver produto' })
    expect(productLink).toHaveAttribute('href', buildProductUrl({ id: 10, name: 'Produto base', seoSlug: undefined }))
  })

  it('não exibe avaliação hardcoded nos cards do catálogo', async () => {
    vi.spyOn(api, 'listPublicProducts').mockResolvedValue({
      items: [makeProduct({ compareAtPrice: 99.9 }), makeProduct({ id: 11, name: 'Outro produto' })],
      meta: { page: 1, pageSize: 12, total: 2, totalPages: 1 },
    })
    renderWithProviders(<CatalogPage />, { initialEntries: ['/catalog'] })

    await screen.findByText('Produto base')
    expect(screen.queryByText('4.9')).not.toBeInTheDocument()
    expect(screen.queryByText('4.7')).not.toBeInTheDocument()
  })

  it('paginação exibe ellipsis quando há muitas páginas', async () => {
    vi.spyOn(api, 'listPublicProducts').mockResolvedValue({
      items: [makeProduct()],
      meta: { page: 1, pageSize: 12, total: 120, totalPages: 10 },
    })
    renderWithProviders(<CatalogPage />, { initialEntries: ['/catalog'] })

    await screen.findByText('Produto base')
    // deve mostrar botões 1, 2, 3 e ellipsis, não todos os 10
    expect(screen.getAllByRole('button', { name: /^\d+$/ }).length).toBeLessThan(10)
    expect(screen.getAllByText('…').length).toBeGreaterThan(0)
  })

  it('exibe mensagem vazia quando nenhum produto é encontrado', async () => {
    vi.spyOn(api, 'listPublicProducts').mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
    })
    renderWithProviders(<CatalogPage />, { initialEntries: ['/catalog'] })

    expect(await screen.findByText('Nenhum produto encontrado')).toBeInTheDocument()
  })

  // Feature 3: Price Range Filter
  it('passa priceMin e priceMax para a API ao ajustar faixa de preço', async () => {
    renderWithProviders(<CatalogPage />, { initialEntries: ['/catalog'] })

    await screen.findByText('Produto base')

    const minSlider = screen.getByRole('slider', { name: /preço mínimo/i })
    const maxSlider = screen.getByRole('slider', { name: /preço máximo/i })

    fireEvent.change(minSlider, { target: { value: '200' } })
    fireEvent.change(maxSlider, { target: { value: '800' } })

    await waitFor(() =>
      expect(api.listPublicProducts).toHaveBeenCalledWith(
        expect.objectContaining({ minPrice: 200, maxPrice: 800 }),
      ),
    )
  })
})
