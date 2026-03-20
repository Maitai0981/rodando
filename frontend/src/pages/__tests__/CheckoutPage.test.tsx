import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import CheckoutPage from '../CheckoutPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { api } from '../../shared/lib/api'

const refreshMock = vi.fn()
const navigateMock = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../shared/context/AuthContext', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { name: 'Cliente Checkout', document: '12345678909', phone: '45999999999' },
  }),
}))

vi.mock('../../shared/context/CartContext', () => ({
  useCart: () => ({
    items: [{ productId: 1, quantity: 1, price: 199.9 }],
    total: 199.9,
    itemCount: 1,
    refresh: refreshMock,
  }),
}))

describe('CheckoutPage', () => {
  beforeEach(() => {
    refreshMock.mockReset()
    navigateMock.mockReset()
    vi.restoreAllMocks()
    vi.spyOn(api, 'listAddresses').mockResolvedValue({
      items: [
        {
          id: 1,
          userId: 1,
          label: 'Casa',
          cep: '01001000',
          street: 'Rua A',
          number: '10',
          complement: '',
          district: 'Centro',
          city: 'Sao Paulo',
          state: 'SP',
          reference: '',
          lat: null,
          lng: null,
          isDefault: true,
          createdAt: '',
          updatedAt: '',
        },
      ],
      defaultAddressId: 1,
    })
    vi.spyOn(api, 'quoteOrder').mockResolvedValue({
      quote: {
        deliveryMethod: 'pickup',
        shippingCost: 0,
        distanceKm: 0,
        etaDays: 1,
        ruleApplied: 'pickup',
        freeShippingApplied: true,
      },
    })
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('gera checkout Mercado Pago e exibe o link de aprovacao', async () => {
    vi.spyOn(api, 'checkoutOrder').mockResolvedValue({
      order: {
        id: 91,
        status: 'created',
        total: 199.9,
        subtotal: 199.9,
        shipping: 0,
        paymentStatus: 'requires_action',
        paymentMethod: 'card_credit',
        createdAt: '',
      },
      payment: {
        provider: 'mercado_pago',
        status: 'requires_action',
        externalId: 'mp-card-order-91',
        checkoutUrl: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=mp-card-order-91',
      },
    })

    renderWithProviders(<CheckoutPage />, { initialEntries: ['/checkout'] })

    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar pagamento' }))

    await waitFor(() => expect(screen.getByText('Checkout Mercado Pago gerado')).toBeInTheDocument())
    expect(screen.getByText(/aguardando aprovacao do pagamento com cartao/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para o Mercado Pago' })).toHaveAttribute(
      'href',
      'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=mp-card-order-91',
    )
  })

  it('conclui o retorno do Mercado Pago e redireciona para o pedido', async () => {
    vi.spyOn(api, 'completeMercadoPagoOrder').mockResolvedValue({
      order: {
        id: 92,
        status: 'created',
        total: 199.9,
        subtotal: 199.9,
        shipping: 0,
        paymentStatus: 'authorized',
        paymentMethod: 'card_credit',
        createdAt: '',
      },
      payment: {
        provider: 'mercado_pago',
        status: 'authorized',
        externalId: 'mp-card-order-92',
        providerPaymentIntentId: 'mp-auth-92',
      },
    })

    renderWithProviders(<CheckoutPage />, { initialEntries: ['/checkout?mpStatus=success&token=mp-card-order-92'] })

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/orders/92', { replace: true }))
    expect(api.completeMercadoPagoOrder).toHaveBeenCalledWith('mp-card-order-92')
    expect(refreshMock).toHaveBeenCalled()
  })

  it('gera Pix, exibe QR Code e copia o codigo', async () => {
    const clipboardWriteText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: clipboardWriteText,
      },
    })

    vi.spyOn(api, 'checkoutOrder').mockResolvedValue({
      order: {
        id: 93,
        status: 'created',
        total: 199.9,
        subtotal: 199.9,
        shipping: 0,
        paymentStatus: 'pending',
        paymentMethod: 'pix',
        createdAt: '',
      },
      payment: {
        provider: 'mercado_pago',
        status: 'pending',
        externalId: 'mp-order-93',
        qrCode: '000201pix-code',
        pix: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+iWbQAAAAASUVORK5CYII=',
      },
    })

    renderWithProviders(<CheckoutPage />, { initialEntries: ['/checkout'] })

    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pix' }))
    fireEvent.click(screen.getByRole('button', { name: 'Gerar pagamento' }))

    await waitFor(() => expect(screen.getByText('Pix gerado')).toBeInTheDocument())
    expect(screen.getByText(/aguardando pagamento via pix/i)).toBeInTheDocument()
    expect(screen.getByAltText('QR Code Pix do pedido')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Copiar codigo Pix' }))

    await waitFor(() => expect(clipboardWriteText).toHaveBeenCalledWith('000201pix-code'))
    expect(screen.getByText('Codigo Pix copiado.')).toBeInTheDocument()
  })
})
