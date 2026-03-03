import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { AssistChecklistCard } from '../AssistChecklistCard'
import { renderWithProviders } from '../../../test/renderWithProviders'

const mockUseAssist = vi.fn()

vi.mock('../../../context/AssistContext', () => ({
  useAssist: () => mockUseAssist(),
}))

describe('AssistChecklistCard', () => {
  const completeStep = vi.fn()
  const setChecklistOpen = vi.fn()
  const resetAssist = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza progresso e permite concluir passo pendente', () => {
    mockUseAssist.mockReturnValue({
      enabled: true,
      activeRoute: {
        key: 'catalog',
        title: 'Catalogo',
        checklist: [
          { id: 'filter-applied', label: 'Aplicar filtro' },
          { id: 'add-to-bag', label: 'Adicionar item' },
        ],
      },
      activeRouteState: {
        checklistState: { 'filter-applied': true },
      },
      checklistOpen: true,
      setChecklistOpen,
      completeStep,
      resetAssist,
    })

    renderWithProviders(<AssistChecklistCard />)

    expect(screen.getByText('Catalogo')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Adicionar item'))
    expect(completeStep).toHaveBeenCalledWith('add-to-bag', 'catalog')
  })

  it('nao renderiza quando assistente esta desabilitado', () => {
    mockUseAssist.mockReturnValue({
      enabled: false,
      activeRoute: null,
      activeRouteState: { checklistState: {} },
      checklistOpen: false,
      setChecklistOpen,
      completeStep,
      resetAssist,
    })

    renderWithProviders(<AssistChecklistCard />)
    expect(screen.queryByTestId('assist-checklist-card')).not.toBeInTheDocument()
  })
})
