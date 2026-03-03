import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import OwnerProductsPage from '../OwnerProductsPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { api, ApiError } from '../../lib/api'

vi.mock('../../layouts/OwnerLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

describe('OwnerProductsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza tabela owner e filtro por status', async () => {
    vi.spyOn(api, 'listOwnerProducts').mockResolvedValue({
      items: [
        {
          id: 99,
          name: 'Item Owner',
          sku: 'OWN-1',
          manufacturer: 'QA',
          category: 'Teste',
          bikeModel: 'CG',
          price: 20,
          stock: 2,
          imageUrl: '',
          description: 'desc',
          isActive: 1,
          createdAt: '',
          updatedAt: '',
        },
      ],
    })
    vi.spyOn(api, 'listOwnerOffers').mockResolvedValue({ items: [] })

    renderWithProviders(<OwnerProductsPage />)

    await waitFor(() => expect(screen.getByText('Item Owner')).toBeInTheDocument())
    expect(screen.getByText(/ativos sem imagem/i)).toBeInTheDocument()
    expect(screen.getByTestId('owner-products-status-filter')).toBeInTheDocument()
  })

  it('abre dialogo e arquiva produto quando escolhido', async () => {
    vi.spyOn(api, 'listOwnerProducts').mockResolvedValue({
      items: [
        {
          id: 10,
          name: 'Produto Arquivavel',
          sku: 'ARQ-1',
          manufacturer: 'QA',
          category: 'Teste',
          bikeModel: 'CG',
          price: 50,
          stock: 8,
          imageUrl: 'https://example.com/image.png',
          description: 'desc',
          isActive: 1,
          createdAt: '',
          updatedAt: '',
        },
      ],
    })
    vi.spyOn(api, 'listOwnerOffers').mockResolvedValue({ items: [] })
    const loadProductsSpy = vi.spyOn(api, 'listOwnerProducts')
    const deleteSpy = vi.spyOn(api, 'deleteProduct').mockResolvedValue({ archived: true })

    renderWithProviders(<OwnerProductsPage />)

    await waitFor(() => expect(screen.getByText('Produto Arquivavel')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('owner-delete-10'))
    await waitFor(() => expect(screen.getByTestId('owner-delete-dialog')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('owner-delete-archive-button'))

    await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith(10, 'archive'))
    await waitFor(() => expect(loadProductsSpy.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('mostra erro amigavel quando exclusao definitiva falha por pedidos', async () => {
    vi.spyOn(api, 'listOwnerProducts').mockResolvedValue({
      items: [
        {
          id: 15,
          name: 'Produto Vendido',
          sku: 'VEN-1',
          manufacturer: 'QA',
          category: 'Teste',
          bikeModel: 'CG',
          price: 90,
          stock: 3,
          imageUrl: 'https://example.com/image.png',
          description: 'desc',
          isActive: 1,
          createdAt: '',
          updatedAt: '',
        },
      ],
    })
    vi.spyOn(api, 'listOwnerOffers').mockResolvedValue({ items: [] })
    vi.spyOn(api, 'deleteProduct').mockRejectedValue(
      new ApiError('Produto ja possui pedidos e nao pode ser excluido definitivamente. Use arquivar.', 409, 'PRODUCT_HAS_ORDERS'),
    )

    renderWithProviders(<OwnerProductsPage />)

    await waitFor(() => expect(screen.getByText('Produto Vendido')).toBeInTheDocument())
    fireEvent.click(screen.getByTestId('owner-delete-15'))
    fireEvent.click(screen.getByTestId('owner-delete-hard-button'))

    await waitFor(() =>
      expect(screen.getByText(/ja possui pedidos e nao pode ser excluido definitivamente/i)).toBeInTheDocument(),
    )
  })
})
