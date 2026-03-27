import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Route, Routes, useLocation } from 'react-router-dom'
import CartPage from '../CartPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { api } from '../../shared/lib/api'

let authStatus: 'authenticated' | 'anonymous' = 'anonymous'
let cartItems: object[] = [
  {
    productId: 1,
    quantity: 1,
    name: 'Kit corrente',
    manufacturer: 'Rodando',
    category: 'Transmissao',
    price: 199.9,
    imageUrl: '/img',
  },
]
const clearMock = vi.fn()
const updateQtyMock = vi.fn()
const removeItemMock = vi.fn()

vi.mock('../../shared/context/AuthContext', () => ({
  useAuth: () => ({ status: authStatus }),
}))

vi.mock('../../shared/context/CartContext', () => ({
  useCart: () => ({
    items: cartItems,
    itemCount: cartItems.length,
    total: cartItems.reduce((s, i: object) => s + ((i as { price: number }).price ?? 0), 0),
    updateQty: updateQtyMock,
    removeItem: removeItemMock,
    clear: clearMock,
    loading: false,
  }),
}))

function LocationReadout() {
  const location = useLocation()
  return <div data-testid="cart-location">{location.pathname}{location.search}</div>
}

describe('CartPage', () => {
  beforeEach(() => {
    authStatus = 'anonymous'
    cartItems = [
      {
        productId: 1,
        quantity: 1,
        name: 'Kit corrente',
        manufacturer: 'Rodando',
        category: 'Transmissao',
        price: 199.9,
        imageUrl: '/img',
      },
    ]
    clearMock.mockReset()
    updateQtyMock.mockReset()
    updateQtyMock.mockResolvedValue({ truncated: false })
    removeItemMock.mockReset()
    vi.restoreAllMocks()
    vi.spyOn(api, 'listAddresses').mockResolvedValue({
      items: [
        {
          id: 9,
          userId: 1,
          label: 'Casa',
          cep: '85800000',
          street: 'Av. Brasil',
          number: '100',
          complement: '',
          district: 'Centro',
          city: 'Cascavel',
          state: 'PR',
          reference: '',
          lat: null,
          lng: null,
          isDefault: true,
          createdAt: '',
          updatedAt: '',
        },
      ],
      defaultAddressId: 9,
    })
    vi.spyOn(api, 'quoteOrder').mockResolvedValue({
      quote: {
        deliveryMethod: 'delivery',
        shippingCost: 18.5,
        distanceKm: 8.2,
        etaDays: 2,
        ruleApplied: 'distance_base',
        freeShippingApplied: false,
      },
    })
  })

  it('redireciona visitante anonimo para /auth?returnTo=/checkout', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/cart" element={<CartPage />} />
        <Route path="/auth" element={<LocationReadout />} />
      </Routes>,
      { initialEntries: ['/cart'] },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Finalizar pedido' }))
    await waitFor(() => expect(screen.getByTestId('cart-location')).toHaveTextContent('/auth?returnTo=/checkout'))
  })

  it('redireciona cliente autenticado para /checkout', async () => {
    authStatus = 'authenticated'
    renderWithProviders(
      <Routes>
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<LocationReadout />} />
      </Routes>,
      { initialEntries: ['/cart'] },
    )

    fireEvent.click(screen.getByRole('button', { name: 'Finalizar pedido' }))
    await waitFor(() => expect(screen.getByTestId('cart-location')).toHaveTextContent('/checkout'))
  })

  it('usa a previsao de frete do backend para entrega', async () => {
    authStatus = 'authenticated'
    renderWithProviders(<CartPage />, { initialEntries: ['/cart'] })

    fireEvent.click(screen.getByRole('button', { name: 'Entrega' }))

    await waitFor(() =>
      expect(api.quoteOrder).toHaveBeenCalledWith({ deliveryMethod: 'delivery', addressId: 9 }),
    )
    expect(await screen.findByText('R$ 18,50')).toBeInTheDocument()
    expect(screen.getAllByText(/Entrega estimada em 2 dia\(s\) para 8.2 km\./)).toHaveLength(2)
  })

  it('exibe carrinho vazio quando não há itens', () => {
    cartItems = []
    renderWithProviders(<CartPage />, { initialEntries: ['/cart'] })

    expect(screen.getByText('Sua mochila está vazia')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finalizar pedido' })).toBeDisabled()
  })

  it('chama removeItem ao clicar no botao remover item', async () => {
    renderWithProviders(<CartPage />, { initialEntries: ['/cart'] })

    const removeBtn = await screen.findByRole('button', { name: /remover item/i })
    fireEvent.click(removeBtn)

    await waitFor(() => expect(removeItemMock).toHaveBeenCalledWith(1), { timeout: 1000 })
  })

  it('chama updateQty ao clicar em aumentar quantidade', async () => {
    renderWithProviders(<CartPage />, { initialEntries: ['/cart'] })

    const increaseBtn = await screen.findByRole('button', { name: /aumentar quantidade/i })
    fireEvent.click(increaseBtn)

    expect(updateQtyMock).toHaveBeenCalledWith(1, 2)
  })
})
