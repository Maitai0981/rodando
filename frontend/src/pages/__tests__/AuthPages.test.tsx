import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Route, Routes, useLocation } from 'react-router-dom'
import SignInPage from '../SignInPage'
import SignUpPage from '../SignUpPage'
import OwnerSignInPage from '../OwnerSignInPage'
import { renderWithProviders } from '../../test/renderWithProviders'

const signInMock = vi.fn()
const signUpMock = vi.fn()
const signInOwnerMock = vi.fn()
const completeStepMock = vi.fn()

vi.mock('../../shared/context/AuthContext', () => ({
  useAuth: () => ({
    signIn: signInMock,
    signUp: signUpMock,
    signInOwner: signInOwnerMock,
  }),
}))

vi.mock('../../shared/context/AssistContext', () => ({
  useAssist: () => ({
    completeStep: completeStepMock,
  }),
}))

function LocationReadout() {
  const location = useLocation()
  return <div data-testid="auth-location">{location.pathname}{location.search}</div>
}

describe('auth pages', () => {
  beforeEach(() => {
    signInMock.mockReset().mockResolvedValue(undefined)
    signUpMock.mockReset().mockResolvedValue(undefined)
    signInOwnerMock.mockReset().mockResolvedValue(undefined)
    completeStepMock.mockReset()
  })

  it('envia signin de cliente e navega para o retorno informado', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/auth" element={<SignInPage />} />
        <Route path="/checkout" element={<LocationReadout />} />
      </Routes>,
      { initialEntries: ['/auth?returnTo=/checkout'] },
    )

    fireEvent.change(screen.getByTestId('signin-email-input'), { target: { value: 'cliente@rodando.local' } })
    fireEvent.change(screen.getByTestId('signin-password-input'), { target: { value: '123456' } })
    fireEvent.click(screen.getByTestId('signin-submit-button'))

    await waitFor(() => expect(signInMock).toHaveBeenCalledWith({ email: 'cliente@rodando.local', password: '123456' }))
    await waitFor(() => expect(screen.getByTestId('auth-location')).toHaveTextContent('/checkout'))
  })

  it('envia signup de cliente e retorna para a home', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/auth/signup" element={<SignUpPage />} />
        <Route path="/" element={<LocationReadout />} />
      </Routes>,
      { initialEntries: ['/auth/signup'] },
    )

    fireEvent.change(screen.getByTestId('signup-name-input'), { target: { value: 'Cliente Novo' } })
    fireEvent.change(screen.getByTestId('signup-email-input'), { target: { value: 'novo@rodando.local' } })
    fireEvent.change(screen.getByTestId('signup-cep-input'), { target: { value: '01001-000' } })
    fireEvent.change(screen.getByTestId('signup-password-input'), { target: { value: '123456' } })
    fireEvent.click(screen.getByTestId('signup-submit-button'))

    await waitFor(() =>
      expect(signUpMock).toHaveBeenCalledWith({
        name: 'Cliente Novo',
        email: 'novo@rodando.local',
        password: '123456',
        cep: '01001000',
      }),
    )
    await waitFor(() => expect(screen.getByTestId('auth-location')).toHaveTextContent('/'))
  })

  it('envia signin owner e navega para o dashboard', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/owner/login" element={<OwnerSignInPage />} />
        <Route path="/owner/dashboard" element={<LocationReadout />} />
      </Routes>,
      { initialEntries: ['/owner/login'] },
    )

    fireEvent.change(screen.getByTestId('owner-signin-email-input'), { target: { value: 'owner@rodando.local' } })
    fireEvent.change(screen.getByTestId('owner-signin-password-input'), { target: { value: '123456' } })
    fireEvent.click(screen.getByTestId('owner-signin-submit-button'))

    await waitFor(() => expect(signInOwnerMock).toHaveBeenCalledWith({ email: 'owner@rodando.local', password: '123456' }))
    await waitFor(() => expect(screen.getByTestId('auth-location')).toHaveTextContent('/owner/dashboard'))
  })
})
