import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { StoreHeader } from '../StoreHeader'

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'
type AuthRole = 'owner' | 'customer'

const authState: {
  status: AuthStatus
  user: { role: AuthRole; name?: string } | null
  logout: () => Promise<void>
} = {
  status: 'anonymous',
  user: null,
  logout: vi.fn(async () => {}),
}

const cartState = {
  itemCount: 0,
}

const completeStepMock = vi.fn()

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => authState,
}))

vi.mock('../../../context/CartContext', () => ({
  useCart: () => cartState,
}))

vi.mock('../../../context/AssistContext', () => ({
  useAssist: () => ({
    completeStep: completeStepMock,
  }),
}))

vi.mock('../../../routes/prefetch', () => ({
  prefetchRouteChunk: vi.fn(),
}))

vi.mock('@mui/material/useMediaQuery', () => ({
  default: () => true,
}))

describe('StoreHeader mobile menu', () => {
  beforeEach(() => {
    authState.status = 'anonymous'
    authState.user = null
    cartState.itemCount = 0
    completeStepMock.mockReset()
  })

  it('abre e fecha menu full-screen mobile', async () => {
    const user = userEvent.setup()
    renderWithProviders(<StoreHeader />)

    await user.click(screen.getByLabelText('Abrir menu'))
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument()
    expect(screen.getByTestId('mobile-menu-link-0')).toHaveAttribute('href', '/')
    expect(screen.getByTestId('mobile-menu-link-1')).toHaveAttribute('href', '/catalog')

    await user.click(screen.getByLabelText('Fechar menu'))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
    })
  })

  it('fecha menu com Escape e retorna foco ao botao trigger', async () => {
    const user = userEvent.setup()
    renderWithProviders(<StoreHeader />)

    const trigger = screen.getByLabelText('Abrir menu')
    await user.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
    })
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger)
    })
  })
})
