import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import OrderDetailsPage from '../OrderDetailsPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { api } from '../../shared/lib/api'

vi.mock('../../shared/context/AuthContext', () => ({
  useAuth: () => authMock,
}))

vi.mock('../../shared/context/AssistContext', () => ({
  useAssist: () => ({ completeStep: vi.fn(), isStepCompleted: vi.fn(() => false) }),
}))

const copyMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('../../shared/lib', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../shared/lib')>()
  return {
    ...mod,
    copyTextToClipboard: copyMock,
  }
})

let authMock = { status: 'authenticated', user: { name: 'Cliente' } }

function makeOrderDetail(overrides = {}) {
  return {
    item: {
      id: 42,
      status: 'created',
      paymentStatus: 'pending',
      paymentMethod: 'pix',
      deliveryMethod: 'pickup',
      subtotal: 149.9,
      shipping: 0,
      total: 149.9,
      etaDays: 1,
      items: [{ orderId: 42, productId: 1, name: 'Aro CG', quantity: 2, lineTotal: 149.9 }],
      events: [{ id: 1, title: 'Pedido criado', status: 'created', description: 'Aguardando pagamento', createdAt: new Date().toISOString() }],
      payment: {
        provider: 'mercado_pago',
        qrCode: 'PIX_CODE_XXXX',
        pix: null,
        checkoutUrl: null,
        simulated: true,
      },
      ...overrides,
    },
  }
}

const getOrderMock = vi.spyOn(api, 'getOrder')
const cancelOrderMock = vi.spyOn(api, 'cancelOrder')
const syncOrderPaymentMock = vi.spyOn(api, 'syncOrderPayment')

function renderOrder(id = '42') {
  return renderWithProviders(
    <Routes>
      <Route path="/orders/:id" element={<OrderDetailsPage />} />
    </Routes>,
    { initialEntries: [`/orders/${id}`] },
  )
}

describe('OrderDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock = { status: 'authenticated', user: { name: 'Cliente' } }
    getOrderMock.mockResolvedValue(makeOrderDetail())
    cancelOrderMock.mockResolvedValue({ item: { id: 42, status: 'cancelled' } })
    syncOrderPaymentMock.mockResolvedValue({ order: { id: 42, paymentStatus: 'paid' } })
  })

  it('exige login quando não autenticado', () => {
    authMock = { status: 'unauthenticated', user: null }
    renderOrder()
    expect(screen.getByText('Detalhe do pedido')).toBeInTheDocument()
    expect(screen.getByText(/faça login/i)).toBeInTheDocument()
  })

  it('exibe mensagem de pedido inválido para id não numérico', () => {
    renderOrder('abc')
    expect(screen.getByText('Pedido inválido.')).toBeInTheDocument()
  })

  it('exibe resumo do pedido com status e total', async () => {
    renderOrder()
    expect(await screen.findByText('Resumo')).toBeInTheDocument()
    expect(screen.getByText('Criado')).toBeInTheDocument()
    expect(screen.getAllByText(/R\$\s*149/).length).toBeGreaterThan(0)
  })

  it('exibe itens do pedido', async () => {
    renderOrder()
    expect(await screen.findByText(/Aro CG • 2x/)).toBeInTheDocument()
  })

  it('exibe timeline do pedido', async () => {
    renderOrder()
    expect(await screen.findByText('Pedido criado')).toBeInTheDocument()
    expect(screen.getByText('Aguardando pagamento')).toBeInTheDocument()
  })

  it('exibe seção PIX com código quando pagamento é pix+pending', async () => {
    renderOrder()
    expect(await screen.findByText('Pagamento via Pix')).toBeInTheDocument()
    expect(screen.getByText('PIX_CODE_XXXX')).toBeInTheDocument()
  })

  it('copia código pix e exibe feedback', async () => {
    const user = userEvent.setup()
    renderOrder()
    const btn = await screen.findByRole('button', { name: /copiar codigo pix/i })
    await user.click(btn)
    await waitFor(() => expect(copyMock).toHaveBeenCalledWith('PIX_CODE_XXXX'))
    expect(await screen.findByText(/codigo pix copiado/i)).toBeInTheDocument()
  })

  it('sincroniza pagamento e exibe feedback de confirmação', async () => {
    const user = userEvent.setup()
    renderOrder()
    const btn = await screen.findByRole('button', { name: /atualizar status/i })
    await user.click(btn)
    await waitFor(() => expect(syncOrderPaymentMock).toHaveBeenCalledWith(42))
    expect(await screen.findByText(/pagamento do pedido #42 confirmado/i)).toBeInTheDocument()
  })

  it('exibe botão cancelar para pedido cancelável', async () => {
    renderOrder()
    expect(await screen.findByRole('button', { name: /cancelar pedido/i })).toBeInTheDocument()
  })

  it('cancela pedido e exibe feedback', async () => {
    const user = userEvent.setup()
    renderOrder()
    const btn = await screen.findByRole('button', { name: /cancelar pedido/i })
    await user.click(btn)
    await waitFor(() => expect(cancelOrderMock).toHaveBeenCalledWith(42))
    expect(await screen.findByText(/pedido #42 cancelado/i)).toBeInTheDocument()
  })

  it('não exibe seção PIX para pedido pago', async () => {
    getOrderMock.mockResolvedValue(makeOrderDetail({ status: 'confirmed', paymentStatus: 'paid' }))
    renderOrder()
    await waitFor(() => expect(getOrderMock).toHaveBeenCalled())
    expect(screen.queryByText('Pagamento via Pix')).not.toBeInTheDocument()
  })
})
