import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrdersPage from '../OrdersPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { api } from '../../shared/lib/api'

vi.mock('../../shared/context/AuthContext', () => ({
  useAuth: () => authMock,
}))

vi.mock('../../shared/context/AssistContext', () => ({
  useAssist: () => ({ completeStep: vi.fn(), isStepCompleted: vi.fn(() => false) }),
}))

let authMock = { status: 'authenticated', user: { name: 'Cliente' } }

function makeOrder(overrides = {}) {
  return {
    id: 1,
    status: 'created',
    paymentStatus: 'pending',
    paymentMethod: 'pix',
    deliveryMethod: 'pickup',
    total: 149.9,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

const listOrdersMock = vi.spyOn(api, 'listOrders')
const cancelOrderMock = vi.spyOn(api, 'cancelOrder')

describe('OrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock = { status: 'authenticated', user: { name: 'Cliente' } }
    listOrdersMock.mockResolvedValue({ items: [] })
    cancelOrderMock.mockResolvedValue({ item: makeOrder({ status: 'cancelled' }) })
  })

  it('exige login quando não autenticado', () => {
    authMock = { status: 'unauthenticated', user: null }
    renderWithProviders(<OrdersPage />, { initialEntries: ['/orders'] })
    expect(screen.getByText('Meus pedidos')).toBeInTheDocument()
    expect(screen.getByText(/faça login/i)).toBeInTheDocument()
  })

  it('exibe estado vazio quando não há pedidos', async () => {
    renderWithProviders(<OrdersPage />, { initialEntries: ['/orders'] })
    expect(await screen.findByText(/ainda não possui pedidos/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /ir para o catálogo/i })).toBeInTheDocument()
  })

  it('lista pedidos carregados da API', async () => {
    listOrdersMock.mockResolvedValue({
      items: [makeOrder({ id: 10, status: 'confirmed', paymentStatus: 'paid' })],
    })
    renderWithProviders(<OrdersPage />, { initialEntries: ['/orders'] })
    expect(await screen.findByText(/pedido #10/i)).toBeInTheDocument()
    expect(screen.getByText('Confirmado')).toBeInTheDocument()
    expect(screen.getByText(/149,90/)).toBeInTheDocument()
  })

  it('não exibe pedidos com status cancelled na lista', async () => {
    listOrdersMock.mockResolvedValue({
      items: [makeOrder({ id: 5, status: 'cancelled' })],
    })
    renderWithProviders(<OrdersPage />, { initialEntries: ['/orders'] })
    await waitFor(() => expect(listOrdersMock).toHaveBeenCalled())
    expect(screen.queryByText(/pedido #5/i)).not.toBeInTheDocument()
  })

  it('exibe botão cancelar apenas para pedidos canceláveis (created+pending)', async () => {
    listOrdersMock.mockResolvedValue({
      items: [makeOrder({ id: 3, status: 'created', paymentStatus: 'pending' })],
    })
    renderWithProviders(<OrdersPage />, { initialEntries: ['/orders'] })
    expect(await screen.findByRole('button', { name: /cancelar pedido/i })).toBeInTheDocument()
  })

  it('não exibe botão cancelar para pedido pago', async () => {
    listOrdersMock.mockResolvedValue({
      items: [makeOrder({ id: 4, status: 'confirmed', paymentStatus: 'paid' })],
    })
    renderWithProviders(<OrdersPage />, { initialEntries: ['/orders'] })
    await waitFor(() => expect(listOrdersMock).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /cancelar pedido/i })).not.toBeInTheDocument()
  })

  it('cancela pedido e exibe feedback de sucesso', async () => {
    const user = userEvent.setup()
    listOrdersMock.mockResolvedValue({
      items: [makeOrder({ id: 7, status: 'created', paymentStatus: 'pending' })],
    })
    renderWithProviders(<OrdersPage />, { initialEntries: ['/orders'] })
    const btn = await screen.findByRole('button', { name: /cancelar pedido/i })
    await user.click(btn)
    await waitFor(() => expect(cancelOrderMock).toHaveBeenCalledWith(7))
    expect(await screen.findByText(/pedido #7 cancelado/i)).toBeInTheDocument()
  })

  it('exibe link Ver detalhes para cada pedido', async () => {
    listOrdersMock.mockResolvedValue({
      items: [makeOrder({ id: 20, status: 'shipped', paymentStatus: 'paid' })],
    })
    renderWithProviders(<OrdersPage />, { initialEntries: ['/orders'] })
    expect(await screen.findByRole('link', { name: /ver detalhes/i })).toBeInTheDocument()
  })
})
