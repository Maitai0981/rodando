import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { AssistOverlayIntro } from '../AssistOverlayIntro'
import { renderWithProviders } from '../../../test/renderWithProviders'

const mockUseAssist = vi.fn()

vi.mock('../../../context/AssistContext', () => ({
  useAssist: () => mockUseAssist(),
}))

describe('AssistOverlayIntro', () => {
  const markOverlaySeen = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('aparece na primeira visita e marca overlay como vista', () => {
    mockUseAssist.mockReturnValue({
      enabled: true,
      activeRoute: {
        key: 'home',
        title: 'Home',
        overlayIntro: ['Passo 1', 'Passo 2'],
      },
      activeRouteState: {
        overlaySeen: false,
      },
      markOverlaySeen,
    })

    renderWithProviders(<AssistOverlayIntro />)

    expect(screen.getByTestId('assist-overlay-intro')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Entendi' }))
    expect(markOverlaySeen).toHaveBeenCalledWith('home')
  })

  it('nao renderiza quando overlay ja foi vista', () => {
    mockUseAssist.mockReturnValue({
      enabled: true,
      activeRoute: {
        key: 'home',
        title: 'Home',
        overlayIntro: ['Passo 1'],
      },
      activeRouteState: {
        overlaySeen: true,
      },
      markOverlaySeen,
    })

    renderWithProviders(<AssistOverlayIntro />)

    expect(screen.queryByTestId('assist-overlay-intro')).not.toBeInTheDocument()
  })
})
