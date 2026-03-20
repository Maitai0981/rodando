import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { axe } from 'vitest-axe'
import SignInPage from '../pages/SignInPage'
import CheckoutPage from '../pages/CheckoutPage'
import OwnerDashboardPage from '../pages/OwnerDashboardPage'
import ProductDetailsPage from '../pages/ProductDetailsPage'
import { api } from '../shared/lib/api'

vi.mock('../shared/layout/OwnerLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../shared/context/AssistContext', () => ({
  useAssist: () => ({
    completeStep: vi.fn(),
    isRouteFirstVisit: vi.fn(() => false),
  }),
}))

vi.mock('../shared/context/AuthContext', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: { name: 'Cliente A11y', document: '12345678909', phone: '45999999999' },
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInOwner: vi.fn(),
  }),
}))

vi.mock('../shared/context/CartContext', () => ({
  useCart: () => ({
    items: [{ productId: 1, quantity: 1, price: 199.9, name: 'Kit corrente' }],
    total: 199.9,
    itemCount: 1,
    clear: vi.fn(),
    addProduct: vi.fn(),
  }),
}))

function renderPage(ui: ReactNode, initialEntries = ['/'], routePath = '*') {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path={routePath} element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('critical pages a11y', () => {
  beforeEach(() => {
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
    vi.spyOn(api, 'ownerDashboard').mockResolvedValue({
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
    vi.spyOn(api, 'getPublicProduct').mockResolvedValue({
      item: {
        id: 1,
        name: 'Kit corrente',
        sku: 'SKU-1',
        manufacturer: 'Rodando',
        category: 'Transmissao',
        bikeModel: 'CG 160',
        price: 199.9,
        stock: 10,
        imageUrl: '/img',
        hoverImageUrl: '/img-hover',
        description: 'desc',
        isActive: true,
        createdAt: '',
        updatedAt: '',
      },
      gallery: { mainUrl: '/img', hoverUrl: '/img-hover', extra: [] },
      pricing: { price: 199.9, compareAtPrice: null, discountPercent: 0 },
      availability: { stock: 10, isActive: true, urgencyLabel: null },
      compatibility: { bikeModel: 'CG 160', fitments: [{ label: 'CG 160', value: 'cg-160' }] },
      seo: { slug: 'kit-corrente', metaTitle: 'Kit corrente', metaDescription: 'desc' },
      socialProof: { averageRating: 4.8, totalReviews: 2 },
    })
    vi.spyOn(api, 'listPublicProducts').mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 4, total: 0, totalPages: 1 },
    })
  })

  it('SignInPage sem violacoes graves', async () => {
    const { container } = renderPage(<SignInPage />, ['/auth'])
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument())
    expect(await axe(container)).toHaveNoViolations()
  })

  it('CheckoutPage sem violacoes graves', async () => {
    const { container } = renderPage(<CheckoutPage />, ['/checkout'])
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument())
    expect(await axe(container)).toHaveNoViolations()
  })

  it('OwnerDashboardPage sem violacoes graves', async () => {
    const { container } = renderPage(<OwnerDashboardPage />, ['/owner/dashboard'])
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Dashboard de produtos' })).toBeInTheDocument())
    expect(await axe(container)).toHaveNoViolations()
  })

  it('ProductDetailsPage sem violacoes graves', async () => {
    const { container } = renderPage(<ProductDetailsPage />, ['/produto/1-kit-corrente'], '/produto/:idSlug')
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Kit corrente' })).toBeInTheDocument())
    expect(await axe(container)).toHaveNoViolations()
  })
})
