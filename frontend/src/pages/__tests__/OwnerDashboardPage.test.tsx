import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import OwnerDashboardPage from '../OwnerDashboardPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { api } from '../../lib/api'

vi.mock('../../layouts/OwnerLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

describe('OwnerDashboardPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renderiza metricas e tabela de produtos', async () => {
    vi.spyOn(api, 'ownerDashboard').mockResolvedValue({
      filters: {
        period: 'month',
        startAt: new Date().toISOString(),
        endAt: new Date().toISOString(),
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
        stockTotal: 15,
        unitsSold: 8,
        revenueTotal: 499.2,
        grossProfitTotal: 140,
        ticketAverage: 62.4,
        averagePrice: 79.9,
        averageMargin: 35,
        averageConversion: 12.5,
        productsMissingImage: 0,
        totalOffers: 1,
        activeOffers: 1,
        totalComments: 2,
        averageRating: 4.7,
        totalReturns: 0,
        returnedUnits: 0,
        openComplaints: 0,
        metricDelta: {
          revenueTotal: 10,
          ticketAverage: 5,
          unitsSold: 12,
          averageMargin: 1.5,
          averageConversion: 2.5,
          outOfStockProducts: -20,
          criticalStockProducts: -10,
          averageRating: 3,
        },
      },
      rankings: {
        topRevenue: [{ id: 1, name: 'Pastilha Pro', revenue: 499.2 }],
        topUnits: [{ id: 1, name: 'Pastilha Pro', unitsSold: 8 }],
        topMargin: [{ id: 1, name: 'Pastilha Pro', marginPercent: 35 }],
        highReturnRate: [],
        lowConversion: [],
      },
      inventory: {
        criticalStock: [],
        lowStock: [],
        stagnant: [],
        overstock: [],
      },
      funnel: {
        views: 100,
        clicks: 40,
        addToCart: 20,
        checkoutStart: 12,
        purchases: 8,
        ctr: 40,
        addToCartRate: 50,
        purchaseRate: 8,
        abandonmentRate: 33.3,
      },
      quality: {
        topReturnReasons: [],
        complaintsBySeverity: [],
        complaintsOpen: 0,
      },
      facets: {
        categories: ['Freio'],
        manufacturers: ['Rodaflex'],
        statuses: ['active'],
      },
      trend: [{ date: '2026-02-01', revenue: 120, units: 2 }],
      products: {
        items: [
          {
            id: 1,
            sku: 'PF-DI-PRO',
            name: 'Pastilha Pro',
            manufacturer: 'Rodaflex',
            category: 'Freio',
            bikeModel: 'CB 300',
            price: 79.9,
            cost: 52,
            marginPercent: 34.9,
            markupPercent: 53.7,
            grossProfit: 120,
            stock: 15,
            minimumStock: 5,
            reorderPoint: 10,
            stockHealth: 'healthy',
            unitsSold: 8,
            orderCount: 4,
            revenue: 499.2,
            conversionRate: 8,
            averageRating: 4.8,
            reviewCount: 2,
            returnRate: 0,
            returnedUnits: 0,
            returnCount: 0,
            openComplaints: 0,
            views: 100,
            clicks: 40,
            addToCart: 20,
            checkoutStart: 12,
            purchases: 8,
            ctr: 40,
            addToCartRate: 50,
            checkoutAbandonmentRate: 33.3,
            sellThroughRate: 34.8,
            daysOfInventory: 12,
            status: 'active',
            isActive: true,
            imageUrl: '/img',
            hasOffer: true,
            compareAtPrice: 99.9,
            discountPercent: 20,
            offerBadge: 'Oferta',
            offerEndsAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastSaleAt: new Date().toISOString(),
          },
        ],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
    })

    renderWithProviders(<OwnerDashboardPage />)

    await waitFor(() => expect(screen.getByText('Dashboard de produtos')).toBeInTheDocument())
    expect(screen.getAllByText('Pastilha Pro').length).toBeGreaterThan(0)
    expect(screen.getByText('Receita')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Exportar CSV/i })).toBeInTheDocument()
    expect(screen.getByTestId('owner-dashboard-table-scroll')).toBeInTheDocument()
  })
})
