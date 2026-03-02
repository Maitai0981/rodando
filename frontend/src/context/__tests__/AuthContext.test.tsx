import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, waitFor, screen, fireEvent } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { AuthProvider, useAuth } from '../AuthContext'
import { api } from '../../lib/api'

function Consumer() {
  const { status, user, signIn, logout } = useAuth()
  return (
    <div>
      <p data-testid="auth-status">{status}</p>
      <p data-testid="auth-user">{user?.email ?? 'none'}</p>
      <button onClick={() => void signIn({ email: 'qa@rodando.local', password: '123456' })}>signin</button>
      <button onClick={() => void logout()}>logout</button>
    </div>
  )
}

function Wrapper({ children }: PropsWithChildren) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('carrega sessao anonima e permite signin/logout', async () => {
    vi.spyOn(api, 'me').mockResolvedValue({ user: null })
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
    vi.spyOn(api, 'logout').mockResolvedValue({ message: 'ok' })

    render(<Consumer />, { wrapper: Wrapper })

    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('anonymous'))
    expect(screen.getByTestId('auth-user')).toHaveTextContent('none')

    fireEvent.click(screen.getByRole('button', { name: 'signin' }))
    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated'))
    expect(screen.getByTestId('auth-user')).toHaveTextContent('qa@rodando.local')

    fireEvent.click(screen.getByRole('button', { name: 'logout' }))
    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('anonymous'))
  })
})
