import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import OwnerGatePage from '../OwnerGatePage'
import { renderWithProviders } from '../../test/renderWithProviders'

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

let mockStatus: AuthStatus = 'anonymous'
let mockUser: { role: string } | null = null

vi.mock('../../shared/context/AuthContext', () => ({
  useAuth: () => ({ status: mockStatus, user: mockUser }),
}))

function DashboardStub() {
  return <div data-testid="owner-dashboard">Dashboard</div>
}

describe('OwnerGatePage', () => {
  it('renderiza titulo da area administrativa', () => {
    mockStatus = 'anonymous'
    mockUser = null
    renderWithProviders(
      <Routes>
        <Route path="/" element={<OwnerGatePage />} />
      </Routes>,
    )

    expect(screen.getByText('Area administrativa de produtos')).toBeInTheDocument()
  })

  it('exibe mensagem de verificacao quando status e loading', () => {
    mockStatus = 'loading'
    mockUser = null
    renderWithProviders(
      <Routes>
        <Route path="/" element={<OwnerGatePage />} />
      </Routes>,
    )

    expect(screen.getByText('Verificando sessao atual...')).toBeInTheDocument()
  })

  it('redireciona owner autenticado para /owner/dashboard', async () => {
    mockStatus = 'authenticated'
    mockUser = { role: 'owner' }
    renderWithProviders(
      <Routes>
        <Route path="/" element={<OwnerGatePage />} />
        <Route path="/owner/dashboard" element={<DashboardStub />} />
      </Routes>,
    )

    await waitFor(() =>
      expect(screen.getByTestId('owner-dashboard')).toBeInTheDocument(),
    )
  })

  it('exibe links de login e area de cliente por padrao', () => {
    mockStatus = 'anonymous'
    mockUser = null
    renderWithProviders(
      <Routes>
        <Route path="/" element={<OwnerGatePage />} />
      </Routes>,
    )

    expect(screen.getByRole('link', { name: 'Entrar como owner' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Area de cliente' })).toBeInTheDocument()
  })
})
