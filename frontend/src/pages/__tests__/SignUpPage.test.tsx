import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import SignUpPage from '../SignUpPage'
import { renderWithProviders } from '../../test/renderWithProviders'

const mockSignUp = vi.fn()

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
  }),
}))

describe('SignUpPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockSignUp.mockReset()
  })

  it('bloqueia submit sem CEP valido', async () => {
    renderWithProviders(<SignUpPage />)

    expect(screen.getByLabelText('Voltar para a página inicial')).toHaveAttribute('href', '/')
    expect(screen.getByTestId('auth-informative-pane')).toHaveAttribute('data-pane-variant', 'amber')

    fireEvent.change(screen.getByTestId('signup-name-input'), { target: { value: 'Cliente QA' } })
    fireEvent.change(screen.getByTestId('signup-email-input'), { target: { value: 'cliente.qa@rodando.local' } })
    fireEvent.change(screen.getByTestId('signup-password-input'), { target: { value: '123456' } })
    fireEvent.click(screen.getByTestId('signup-submit-button'))

    await waitFor(() => expect(screen.getByText(/CEP e obrigatorio/i)).toBeInTheDocument())
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('define autocomplete correto para nome, email e senha', async () => {
    renderWithProviders(<SignUpPage />)

    expect(screen.getByTestId('signup-name-input')).toHaveAttribute('autocomplete', 'name')
    expect(screen.getByTestId('signup-email-input')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByTestId('signup-password-input')).toHaveAttribute('autocomplete', 'new-password')
  })

  it('consulta CEP e envia payload com endereco no signUp', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          logradouro: 'Praca da Se',
          localidade: 'Sao Paulo',
          uf: 'SP',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    )

    mockSignUp.mockResolvedValue({
      id: 1,
      name: 'Cliente QA',
      email: 'cliente.qa@rodando.local',
      role: 'customer',
      cep: '01001000',
      addressStreet: 'Praca da Se',
      addressCity: 'Sao Paulo',
      addressState: 'SP',
      createdAt: new Date().toISOString(),
    })

    renderWithProviders(<SignUpPage />)

    fireEvent.change(screen.getByTestId('signup-name-input'), { target: { value: 'Cliente QA' } })
    fireEvent.change(screen.getByTestId('signup-email-input'), { target: { value: 'cliente.qa@rodando.local' } })
    fireEvent.change(screen.getByTestId('signup-password-input'), { target: { value: '123456' } })
    fireEvent.change(screen.getByTestId('signup-cep-input'), { target: { value: '01001000' } })

    await waitFor(() => expect(screen.getByTestId('signup-address-city-input')).toHaveValue('Sao Paulo'))
    await waitFor(() => expect(screen.getByTestId('signup-address-state-input')).toHaveValue('SP'))

    fireEvent.click(screen.getByTestId('signup-submit-button'))

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1))
    expect(mockSignUp).toHaveBeenCalledWith({
      name: 'Cliente QA',
      email: 'cliente.qa@rodando.local',
      password: '123456',
      cep: '01001-000',
      addressStreet: 'Praca da Se',
      addressCity: 'Sao Paulo',
      addressState: 'SP',
    })
  })
})
