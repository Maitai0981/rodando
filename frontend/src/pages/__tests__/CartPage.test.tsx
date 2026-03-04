import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import CartPage from '../CartPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { api } from '../../lib/api'

const mockAuthState: {
  status: 'authenticated' | 'anonymous'
  user?: { name?: string; document?: string; phone?: string }
} = {
  status: 'authenticated',
  user: { name: 'Cliente Teste', document: '', phone: '' },
}

const mockCartState: {
  items: Array<{
    productId: number
    name: string
    manufacturer: string
    bikeModel: string
    sku: string
    stock: number
    imageUrl: string
    price: number
    quantity: number
  }>
  total: number
  itemCount: number
  loading: boolean
  updateQty: ReturnType<typeof vi.fn>
  removeItem: ReturnType<typeof vi.fn>
  clear: ReturnType<typeof vi.fn>
} = {
  items: [],
  total: 0,
  itemCount: 0,
  loading: false,
  updateQty: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

vi.mock('../../layouts/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}))

vi.mock('../../context/CartContext', () => ({
  useCart: () => mockCartState,
}))

describe('CartPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockAuthState.status = 'authenticated'
    mockAuthState.user = { name: 'Cliente Teste', document: '', phone: '' }
    mockCartState.items = []
    mockCartState.total = 0
    mockCartState.itemCount = 0
    mockCartState.loading = false
    mockCartState.updateQty = vi.fn()
    mockCartState.removeItem = vi.fn()
    mockCartState.clear = vi.fn()
  })

  it('renderiza estado vazio e CTA de checkout desabilitado', async () => {
    vi.spyOn(api, 'listCatalogRecommendations').mockResolvedValue({ items: [] })

    renderWithProviders(<CartPage />)

    await waitFor(() => expect(screen.getByText('Itens selecionados')).toBeInTheDocument())
    await waitFor(() => expect(screen.getByText('Sua mochila esta vazia')).toBeInTheDocument())
    expect(screen.getByText('Resumo')).toBeInTheDocument()
    expect(screen.getByTestId('cart-checkout-button')).toBeDisabled()
    expect(screen.getByTestId('cart-empty-catalog-cta')).toBeInTheDocument()
  })

  it('exige confirmacao antes de limpar mochila e permite seguir para checkout com itens', async () => {
    mockAuthState.user = { name: '', document: '', phone: '' }
    mockCartState.items = [
      {
        productId: 10,
        name: 'Produto Guardrail',
        manufacturer: 'QA',
        bikeModel: 'CG 160',
        sku: 'QA-10',
        stock: 5,
        imageUrl: 'https://example.com/produto.jpg',
        price: 99.9,
        quantity: 1,
      },
    ]
    mockCartState.total = 99.9
    mockCartState.itemCount = 1

    vi.spyOn(api, 'listCatalogRecommendations').mockResolvedValue({ items: [] })

    renderWithProviders(<CartPage />)

    await waitFor(() => expect(screen.getByText('Produto Guardrail')).toBeInTheDocument())
    expect(screen.getByTestId('cart-checkout-button')).toBeEnabled()

    fireEvent.click(screen.getByTestId('cart-clear'))
    expect(screen.getByRole('dialog', { name: 'Limpar mochila?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Limpar mochila?' })).not.toBeInTheDocument()
    })
  })
})
