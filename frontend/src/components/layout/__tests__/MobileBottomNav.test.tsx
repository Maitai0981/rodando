import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { theme } from '../../../theme'
import { MobileBottomNav } from '../MobileBottomNav'

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'
type AuthRole = 'owner' | 'customer'

const authState: {
  status: AuthStatus
  user: { role: AuthRole; name?: string } | null
} = {
  status: 'anonymous',
  user: null,
}

const cartState: { itemCount: number } = {
  itemCount: 0,
}

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../../../context/CartContext', () => ({
  useCart: () => cartState,
}))

vi.mock('@mui/material/useMediaQuery', () => ({
  default: () => true,
}))

function renderNav(initialRoute: string) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <MobileBottomNav />
      </MemoryRouter>
    </ThemeProvider>
  )
}

describe('MobileBottomNav', () => {
  beforeEach(() => {
    authState.status = 'anonymous'
    authState.user = null
    cartState.itemCount = 0
  })

  it('renderiza os quatro itens e marca rota ativa', () => {
    renderNav('/')

    expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-nav-home')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('mobile-nav-catalog')).toHaveAttribute('href', '/catalog')
    expect(screen.getByTestId('mobile-nav-cart')).toHaveAttribute('href', '/cart')
    expect(screen.getByTestId('mobile-nav-account')).toHaveAttribute('href', '/auth')
    expect(screen.getByTestId('mobile-nav-home').querySelector('[data-icon-name="HomeRoundedIcon"]')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-nav-catalog').querySelector('[data-icon-name="CategoryRoundedIcon"]')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-nav-cart').querySelector('[data-icon-name="ShoppingBagOutlinedIcon"]')).toBeInTheDocument()
    expect(screen.getByTestId('mobile-nav-account').querySelector('[data-icon-name="PersonOutlineRoundedIcon"]')).toBeInTheDocument()
  })

  it('mostra quantidade na mochila e ativa rota de catalogo', () => {
    cartState.itemCount = 3
    renderNav('/catalog')

    expect(screen.getByTestId('mobile-nav-catalog')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Mochila (3)')).toBeInTheDocument()
  })

  it('aponta conta para dashboard owner quando autenticado como owner', () => {
    authState.status = 'authenticated'
    authState.user = { role: 'owner', name: 'Owner QA' }

    renderNav('/cart')

    expect(screen.getByTestId('mobile-nav-account')).toHaveAttribute('href', '/owner/dashboard')
  })
})

