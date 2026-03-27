import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test/renderWithProviders'
import SiteLayout from '../SiteLayout'

const mockLogout = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({ status: 'anonymous', user: null, logout: mockLogout })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('../../context/CartContext', () => ({
  useCart: vi.fn(() => ({ itemCount: 0 })),
  CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('../../context/AssistContext', () => ({
  useAssist: () => ({ completeStep: vi.fn() }),
  AssistProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('framer-motion', async (importOriginal) => {
  const mod = await importOriginal<typeof import('framer-motion')>()
  return {
    ...mod,
    m: mod.motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  }
})

import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'

describe('SiteLayout', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ status: 'anonymous', user: null, logout: mockLogout })
    vi.mocked(useCart).mockReturnValue({ itemCount: 0 })
  })

  it('exibe links de navegação padrão para visitante anônimo', () => {
    renderWithProviders(<SiteLayout />, { initialEntries: ['/'] })
    expect(screen.getAllByText('Início').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Catálogo').length).toBeGreaterThan(0)
  })

  it('exibe itens do menu do avatar para cliente autenticado', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: { name: 'João', role: 'customer' },
      logout: mockLogout,
    })
    renderWithProviders(<SiteLayout />, { initialEntries: ['/'] })
    const avatarBtn = screen.getByRole('button', { name: /menu de joão/i })
    fireEvent.click(avatarBtn)
    expect(screen.getByText('Meus pedidos')).toBeInTheDocument()
    expect(screen.getByText('Meu perfil')).toBeInTheDocument()
  })

  it('não exibe itens de conta no nav para visitante anônimo', () => {
    renderWithProviders(<SiteLayout />, { initialEntries: ['/'] })
    expect(screen.queryByText('Meus pedidos')).not.toBeInTheDocument()
    expect(screen.queryByText('Minha conta')).not.toBeInTheDocument()
  })

  it('exibe contagem do carrinho quando há itens', () => {
    vi.mocked(useCart).mockReturnValue({ itemCount: 3 })
    renderWithProviders(<SiteLayout />, { initialEntries: ['/'] })
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('exibe botão de sair no dropdown do avatar para cliente autenticado', () => {
    vi.mocked(useAuth).mockReturnValue({
      status: 'authenticated',
      user: { name: 'Ana', role: 'customer' },
      logout: mockLogout,
    })
    renderWithProviders(<SiteLayout />, { initialEntries: ['/'] })
    const avatarBtn = screen.getByRole('button', { name: /menu de ana/i })
    fireEvent.click(avatarBtn)
    expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument()
  })
})
