import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import OwnerSignInPage from '../OwnerSignInPage'
import { renderWithProviders } from '../../test/renderWithProviders'

const mockSignInOwner = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    signInOwner: mockSignInOwner,
  }),
}))

describe('OwnerSignInPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockSignInOwner.mockReset()
  })

  it('renderiza seta de voltar para Home', async () => {
    renderWithProviders(<OwnerSignInPage />)

    const backButton = screen.getByLabelText('Voltar para a página inicial')
    expect(backButton).toBeInTheDocument()
    expect(backButton).toHaveAttribute('href', '/')
    expect(screen.getByTestId('auth-informative-pane')).toHaveAttribute('data-pane-variant', 'amber')
  })

  it('define autocomplete correto para email e senha owner', async () => {
    renderWithProviders(<OwnerSignInPage />)

    expect(screen.getByTestId('owner-signin-email-input')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByTestId('owner-signin-password-input')).toHaveAttribute('autocomplete', 'current-password')
  })
})
