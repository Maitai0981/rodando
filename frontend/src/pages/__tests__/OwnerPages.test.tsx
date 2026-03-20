import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import OwnerDashboardPage from '../OwnerDashboardPage'
import OwnerOrdersPage from '../OwnerOrdersPage'
import OwnerProductsPage from '../OwnerProductsPage'
import OwnerSettingsPage from '../OwnerSettingsPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { api } from '../../shared/lib/api'

vi.mock('../../shared/layout/OwnerLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../shared/context/AssistContext', () => ({
  useAssist: () => ({
    completeStep: vi.fn(),
    isRouteFirstVisit: vi.fn(() => false),
  }),
}))

const ownerDashboardMock = vi.spyOn(api, 'ownerDashboard')
const listOwnerProductsMock = vi.spyOn(api, 'listOwnerProducts')
const listOwnerOffersMock = vi.spyOn(api, 'listOwnerOffers')
const listOwnerOrdersMock = vi.spyOn(api, 'listOwnerOrders')
const getOwnerOrderMock = vi.spyOn(api, 'getOwnerOrder')
const updateOwnerOrderStatusMock = vi.spyOn(api, 'updateOwnerOrderStatus')
const getOwnerSettingsMock = vi.spyOn(api, 'getOwnerSettings')
const updateOwnerSettingsMock = vi.spyOn(api, 'updateOwnerSettings')

describe('owner pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    ownerDashboardMock.mockResolvedValue({
      filters: {
        period: 'month',
        startAt: '',
        endAt: '',
        category: null,
        manufacturer: null,
        status: 'all',
        q: '',
        sortBy: 'revenue',
        direction: 'desc',
        page: 1,
        pageSize: 20,
      },
      metrics: {
        totalProducts: 1,
        activeProducts: 1,
        inactiveProducts: 0,
        outOfStockProducts: 0,
        criticalStockProducts: 0,
        lowStockProducts: 0,
        stockTotal: 10,
        unitsSold: 2,
        revenueTotal: 399.8,
        grossProfitTotal: 200,
        ticketAverage: 199.9,
        averagePrice: 199.9,
        averageMargin: 45,
        averageConversion: 2.5,
        productsMissingImage: 0,
        totalOffers: 0,
        activeOffers: 0,
        totalComments: 0,
        averageRating: 4.8,
      },
      rankings: { topRevenue: [], topUnits: [], topMargin: [], highReturnRate: [], lowConversion: [] },
      inventory: { criticalStock: [], lowStock: [], stagnant: [], overstock: [] },
      funnel: {
        views: 10,
        clicks: 8,
        addToCart: 3,
        checkoutStart: 2,
        purchases: 2,
        ctr: 80,
        addToCartRate: 30,
        purchaseRate: 20,
        abandonmentRate: 0,
      },
      facets: { categories: ['Transmissao'], manufacturers: ['Rodando'], statuses: ['active'] },
      trend: [],
      products: {
        items: [
          {
            id: 1,
            sku: 'SKU-1',
            name: 'Kit corrente',
            manufacturer: 'Rodando',
            category: 'Transmissao',
            bikeModel: 'CG 160',
            price: 199.9,
            cost: 99.9,
            marginPercent: 50,
            markupPercent: 100,
            grossProfit: 100,
            stock: 10,
            minimumStock: 3,
            reorderPoint: 5,
            stockHealth: 'healthy',
            unitsSold: 2,
            orderCount: 1,
            revenue: 399.8,
            conversionRate: 2.5,
            averageRating: 4.8,
            reviewCount: 2,
            returnRate: 0,
            returnedUnits: 0,
            returnCount: 0,
            openComplaints: 0,
            views: 10,
            clicks: 8,
            addToCart: 3,
            checkoutStart: 2,
            purchases: 2,
            ctr: 80,
            addToCartRate: 30,
            checkoutAbandonmentRate: 0,
            sellThroughRate: 20,
            daysOfInventory: 15,
            status: 'active',
            isActive: true,
            imageUrl: '/img',
            hasOffer: false,
            compareAtPrice: null,
            discountPercent: 0,
            offerBadge: null,
            offerEndsAt: null,
            createdAt: '',
            updatedAt: '',
            lastSaleAt: null,
          },
        ],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    })

    listOwnerProductsMock.mockImplementation(async (query = '') => ({
      items: [
        {
          id: 1,
          name: query ? `Produto ${query}` : 'Produto base',
          sku: 'SKU-1',
          manufacturer: 'Rodando',
          category: 'Transmissao',
          bikeModel: 'CG 160',
          price: 199.9,
          stock: 10,
          imageUrl: '/img',
          description: 'desc',
          isActive: true,
          createdAt: '',
          updatedAt: '',
        },
      ],
    }))
    listOwnerOffersMock.mockResolvedValue({ items: [] })

    listOwnerOrdersMock.mockImplementation(async (params = {}) => ({
      items: [
        {
          id: 1,
          status: 'paid',
          total: 199.9,
          subtotal: 199.9,
          shipping: 0,
          paymentStatus: 'paid',
          paymentMethod: 'card_credit',
          deliveryMethod: 'pickup',
          etaDays: 1,
          distanceKm: 0,
          deliveryCity: params.city || 'Cascavel',
          deliveryState: 'PR',
          createdAt: '',
          updatedAt: '',
          customer: { id: 1, name: params.customer || 'Cliente QA', email: 'cliente@rodando.local' },
        },
      ],
    }))
    getOwnerOrderMock.mockResolvedValue({
      item: {
        id: 1,
        status: 'paid',
        customer: { name: 'Cliente QA' },
      },
    })
    updateOwnerOrderStatusMock.mockResolvedValue({ item: { id: 1, status: 'shipped' } })

    getOwnerSettingsMock.mockResolvedValue({
      item: {
        ownerUserId: 1,
        salesAlertEmail: 'owner@rodando.local',
        salesAlertWhatsapp: '',
        storeName: 'Rodando',
        storeCnpj: '',
        storeIe: '',
        storeAddressStreet: 'Rua A',
        storeAddressNumber: '10',
        storeAddressComplement: '',
        storeAddressDistrict: 'Centro',
        storeAddressCity: 'Cascavel',
        storeAddressState: 'PR',
        storeAddressCep: '85807080',
        storeLat: -24.9555,
        storeLng: -53.4552,
        freeShippingGlobalMin: 199,
        taxProfile: 'simples_nacional',
        taxPercent: 0.06,
        gatewayFeePercent: 0.049,
        gatewayFixedFee: 0,
        operationalPercent: 0.03,
        packagingCost: 0,
        blockBelowMinimum: false,
        createdAt: '',
        updatedAt: '',
      },
    })
    updateOwnerSettingsMock.mockImplementation(async (payload) => ({ item: payload }))
  })

  it('dashboard exibe cards de metricas com receita e unidades vendidas', async () => {
    renderWithProviders(<OwnerDashboardPage />)

    await waitFor(() => {
      expect(ownerDashboardMock).toHaveBeenCalled()
      expect(screen.getAllByText('Receita').length).toBeGreaterThan(0)
    })
    expect(screen.getByText('Unidades vendidas')).toBeInTheDocument()
    expect(screen.getAllByText(/399/).length).toBeGreaterThan(0)
  })

  it('dashboard usa a busca com Enter e mantém page=1', async () => {
    renderWithProviders(<OwnerDashboardPage />)

    await waitFor(() => expect(ownerDashboardMock).toHaveBeenCalled())
    const input = screen.getByLabelText('Busca')
    fireEvent.change(input, { target: { value: 'kit' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() =>
      expect(ownerDashboardMock).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'kit', page: 1 })),
    )
  })

  it('products busca, aplica e restaura lista sem filtro ao limpar o campo', async () => {
    renderWithProviders(<OwnerProductsPage />)

    await waitFor(() => expect(listOwnerProductsMock).toHaveBeenCalledWith(''))
    await waitFor(() => expect(screen.getByText('Produtos ativos com imagem valida aparecem no catalogo publico.')).toBeInTheDocument())
    const searchInput = screen.getByTestId('owner-products-search-input')
    fireEvent.change(searchInput, { target: { value: 'corrente' } })
    fireEvent.click(screen.getByTestId('owner-products-search-button'))

    await waitFor(() => expect(listOwnerProductsMock).toHaveBeenLastCalledWith('corrente'))

    fireEvent.change(searchInput, { target: { value: '' } })
    fireEvent.click(screen.getByTestId('owner-products-search-button'))

    await waitFor(() => expect(listOwnerProductsMock).toHaveBeenLastCalledWith(''))
  })

  it('orders aplica filtros e permite atualizar status do pedido selecionado', async () => {
    renderWithProviders(<OwnerOrdersPage />)

    await waitFor(() => expect(listOwnerOrdersMock).toHaveBeenCalled())
    const cityInput = screen.getByLabelText('Cidade')
    fireEvent.change(cityInput, { target: { value: 'Curitiba' } })

    await waitFor(() =>
      expect(listOwnerOrdersMock).toHaveBeenLastCalledWith(expect.objectContaining({ city: 'Curitiba' })),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Detalhes' }))
    await waitFor(() => expect(getOwnerOrderMock).toHaveBeenCalledWith(1))
    const statusSelect = await screen.findByLabelText(/atualizar status/i)

    fireEvent.change(statusSelect, { target: { value: 'shipped' } })
    await waitFor(() => expect(updateOwnerOrderStatusMock).toHaveBeenCalledWith(1, 'shipped'))
  })

  it('settings salva o draft atualizado', async () => {
    renderWithProviders(<OwnerSettingsPage />)

    await waitFor(() => expect(getOwnerSettingsMock).toHaveBeenCalled())
    const emailInput = await screen.findByLabelText(/email de alerta/i)
    fireEvent.change(emailInput, { target: { value: 'financeiro@rodando.local' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar configurações' }))

    await waitFor(() =>
      expect(updateOwnerSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({ salesAlertEmail: 'financeiro@rodando.local' }),
      ),
    )
  })
})
