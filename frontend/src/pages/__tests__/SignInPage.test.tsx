import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import SignInPage from '../SignInPage'
import { renderWithProviders } from '../../test/renderWithProviders'

const mockSignIn = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
  }),
}))

describe('SignInPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockSignIn.mockReset()
  })

  it('renderiza seta de voltar para Home', async () => {
    renderWithProviders(<SignInPage />)

    const backButton = screen.getByLabelText('Voltar para a página inicial')
    expect(backButton).toBeInTheDocument()
    expect(backButton).toHaveAttribute('href', '/')
    expect(screen.getByTestId('auth-informative-pane')).toHaveAttribute('data-pane-variant', 'amber')
  })

  it('define autocomplete correto para email e senha', async () => {
    renderWithProviders(<SignInPage />)

    expect(screen.getByTestId('signin-email-input')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByTestId('signin-password-input')).toHaveAttribute('autocomplete', 'current-password')
  })
})
