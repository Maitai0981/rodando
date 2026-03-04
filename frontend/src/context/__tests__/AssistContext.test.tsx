import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AssistProvider, useAssist } from '../AssistContext'
import { api } from '../../lib/api'

const mockAuthState = {
  status: 'anonymous',
  user: null as null | { id: number },
}

vi.mock('../AuthContext', () => ({
  useAuth: () => mockAuthState,
}))

function Harness() {
  const { completeStep, isStepCompleted, isRouteFirstVisit } = useAssist()
  return (
    <>
      <button type="button" onClick={() => completeStep('open-catalog', 'home')}>
        complete-home-step
      </button>
      <p data-testid="assist-first-visit-home">
        {isRouteFirstVisit('home') ? 'first-visit' : 'visited'}
      </p>
      <p data-testid="assist-first-visit-catalog">
        {isRouteFirstVisit('catalog') ? 'first-visit' : 'visited'}
      </p>
      <p data-testid="assist-step-state">
        {isStepCompleted('open-catalog', 'home') ? 'done' : 'pending'}
      </p>
    </>
  )
}

function renderWithAssist(ui: ReactNode, initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AssistProvider>{ui}</AssistProvider>
    </MemoryRouter>,
  )
}

describe('AssistContext', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockAuthState.status = 'anonymous'
    mockAuthState.user = null
    window.localStorage.removeItem('rodando.assist.local.v1')
    window.localStorage.removeItem('rodando.assist.ui.v1')
    window.localStorage.removeItem('rodando.assist.rollout.v1')
    window.localStorage.removeItem('rodando.assist.first-visit.browser.v1')
  })

  it('persiste progresso no localStorage para visitante anonimo', async () => {
    renderWithAssist(<Harness />)

    expect(screen.getByTestId('assist-step-state')).toHaveTextContent('pending')
    fireEvent.click(screen.getByRole('button', { name: 'complete-home-step' }))
    expect(screen.getByTestId('assist-step-state')).toHaveTextContent('done')

    const persisted = JSON.parse(window.localStorage.getItem('rodando.assist.local.v1') || '{}')
    expect(persisted?.home?.checklistState?.['open-catalog']).toBe(true)
  })

  it('faz merge local->servidor ao autenticar e limpa cache local', async () => {
    mockAuthState.status = 'authenticated'
    mockAuthState.user = { id: 11 }

    window.localStorage.setItem(
      'rodando.assist.local.v1',
      JSON.stringify({
        home: {
          checklistState: { 'open-catalog': true },
          dismissedTips: [],
          overlaySeen: true,
          updatedAt: new Date().toISOString(),
        },
      }),
    )

    const getAssistStateSpy = vi.spyOn(api, 'getAssistState').mockResolvedValue({ items: [] })
    const updateAssistStateSpy = vi.spyOn(api, 'updateAssistState').mockResolvedValue({
      item: {
        id: 1,
        userId: 11,
        scope: 'public',
        routeKey: 'home',
        checklistState: { 'open-catalog': true },
        dismissedTips: [],
        overlaySeen: true,
        updatedAt: new Date().toISOString(),
      },
    })

    renderWithAssist(<Harness />)

    await waitFor(() => {
      expect(getAssistStateSpy).toHaveBeenCalledTimes(2)
      expect(updateAssistStateSpy).toHaveBeenCalledTimes(1)
    })
    expect(updateAssistStateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: 'public',
        routeKey: 'home',
        overlaySeen: true,
      }),
    )
    expect(window.localStorage.getItem('rodando.assist.local.v1')).toBeNull()
  })

  it('marca rota como visitada no navegador e nao repete primeira visita', async () => {
    const firstRender = renderWithAssist(<Harness />, '/catalog')
    expect(screen.getByTestId('assist-first-visit-catalog')).toHaveTextContent('first-visit')

    const firstVisitState = JSON.parse(window.localStorage.getItem('rodando.assist.first-visit.browser.v1') || '{}')
    expect(firstVisitState.catalog).toBe(true)

    firstRender.unmount()
    renderWithAssist(<Harness />, '/catalog')
    await waitFor(() => {
      expect(screen.getByTestId('assist-first-visit-catalog')).toHaveTextContent('visited')
    })
  })
})
