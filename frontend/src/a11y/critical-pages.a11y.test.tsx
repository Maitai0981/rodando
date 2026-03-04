import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material'
import { axe } from 'vitest-axe'
import HomePage from '../pages/HomePage'
import CatalogPage from '../pages/CatalogPage'
import CartPage from '../pages/CartPage'
import SignInPage from '../pages/SignInPage'
import OwnerProductsPage from '../pages/OwnerProductsPage'
import { api } from '../lib/api'
import { dsTheme } from '../design-system/theme'

vi.mock('../layouts/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../layouts/OwnerLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null, status: 'anonymous', signIn: vi.fn(), signUp: vi.fn(), logout: vi.fn() }),
}))

vi.mock('../context/CartContext', () => ({
  useCart: () => ({
    addProduct: vi.fn(),
    items: [],
    itemCount: 0,
    total: 0,
    loading: false,
    updateQty: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }),
}))

function wrap(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return (
    <ThemeProvider theme={dsTheme}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

async function expectNoCriticalViolations(container: HTMLElement) {
  const results = await axe(container, {
    rules: {
      'color-contrast': { enabled: false },
    },
  })
  expect(results.violations).toEqual([])
}

describe('critical pages a11y', () => {
  beforeEach(() => {
    vi.restoreAllMocks()

    vi.spyOn(api, 'listCatalogHighlights').mockResolvedValue({ items: [] })
    vi.spyOn(api, 'listPublicProducts').mockResolvedValue({
      items: [],
      meta: { page: 1, pageSize: 12, total: 0, totalPages: 1 },
    })
    vi.spyOn(api, 'listComments').mockResolvedValue({
      items: [],
      summary: { averageRating: 0, totalReviews: 0 },
    })
    vi.spyOn(api, 'listCatalogRecommendations').mockResolvedValue({ items: [] })
    vi.spyOn(api, 'listOwnerProducts').mockResolvedValue({ items: [] })
    vi.spyOn(api, 'listOwnerOffers').mockResolvedValue({ items: [] })
    vi.spyOn(api, 'signIn').mockResolvedValue({
      message: 'ok',
      user: {
        id: 1,
        name: 'QA',
        email: 'qa@rodando.local',
        role: 'customer',
        cep: '01001000',
        addressStreet: 'Praca da Se',
        addressCity: 'Sao Paulo',
        addressState: 'SP',
        createdAt: new Date().toISOString(),
      },
    })
  })

  it('HomePage sem violacoes graves', { timeout: 20000 }, async () => {
    const { container } = render(wrap(<HomePage />))
    await waitFor(() => expect(container).toBeTruthy())
    await expectNoCriticalViolations(container)
  })

  it('CatalogPage sem violacoes graves', { timeout: 20000 }, async () => {
    const { container } = render(wrap(<CatalogPage />))
    await waitFor(() => expect(container).toBeTruthy())
    await expectNoCriticalViolations(container)
  })

  it('CartPage sem violacoes graves', { timeout: 20000 }, async () => {
    const { container } = render(wrap(<CartPage />))
    await waitFor(() => expect(container).toBeTruthy())
    await expectNoCriticalViolations(container)
  })

  it('SignInPage sem violacoes graves', { timeout: 20000 }, async () => {
    const { container } = render(wrap(<SignInPage />))
    await waitFor(() => expect(container).toBeTruthy())
    await expectNoCriticalViolations(container)
  })

  it('OwnerProductsPage sem violacoes graves', { timeout: 20000 }, async () => {
    const { container } = render(wrap(<OwnerProductsPage />))
    await waitFor(() => expect(container).toBeTruthy())
    await expectNoCriticalViolations(container)
  })
})
