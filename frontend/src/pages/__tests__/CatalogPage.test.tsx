import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import CatalogPage from '../CatalogPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { api } from '../../lib/api'

vi.mock('../../layouts/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../context/CartContext', () => ({
  useCart: () => ({ addProduct: vi.fn() }),
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ status: 'authenticated' }),
}))

describe('CatalogPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza filtros e lista de produtos', async () => {
    vi.spyOn(api, 'listPublicProducts').mockImplementation(async () => ({
      items: [
        {
          id: 10,
          name: 'Camera Aro 18',
          sku: 'CA18',
          manufacturer: 'Rodando',
          category: 'Camera',
          bikeModel: 'CG',
          price: 49.9,
          stock: 5,
          imageUrl: '/img',
          description: 'desc',
          isActive: 1,
          createdAt: '',
          updatedAt: '',
        },
      ],
      meta: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
    }))

    renderWithProviders(<CatalogPage />)

    expect(screen.getByTestId('catalog-search-input')).toBeInTheDocument()
    expect(screen.getByTestId('catalog-apply-filters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filtros e ordenacao' })).toBeInTheDocument()

    fireEvent.change(screen.getByTestId('catalog-search-input'), { target: { value: 'camera' } })
    fireEvent.click(screen.getByTestId('catalog-apply-filters'))

    await waitFor(() => expect(screen.getByText('Camera Aro 18')).toBeInTheDocument())
  })

  it('renderiza estado vazio compacto com acao de limpar filtros', async () => {
    vi.spyOn(api, 'listPublicProducts').mockImplementation(async () => ({
      items: [],
      meta: { page: 1, pageSize: 12, total: 0, totalPages: 1 },
    }))

    renderWithProviders(<CatalogPage />)

    await waitFor(() => expect(screen.getByText('Nenhum produto encontrado')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument()
  })
})
