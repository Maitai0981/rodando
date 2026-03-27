import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import ForgotPasswordPage from '../ForgotPasswordPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { ApiError } from '../../shared/lib/api'

const { requestPasswordResetMock, confirmPasswordResetMock } = vi.hoisted(() => ({
  requestPasswordResetMock: vi.fn(),
  confirmPasswordResetMock: vi.fn(),
}))

vi.mock('../../shared/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/lib/api')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      requestPasswordReset: requestPasswordResetMock,
      confirmPasswordReset: confirmPasswordResetMock,
    },
  }
})

function renderPage(initialPath = '/auth/forgot-password') {
  return renderWithProviders(
    <Routes>
      <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth" element={<div data-testid="auth-page" />} />
    </Routes>,
    { initialEntries: [initialPath] },
  )
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    requestPasswordResetMock.mockReset().mockResolvedValue({ message: 'ok' })
    confirmPasswordResetMock.mockReset().mockResolvedValue({ message: 'Senha redefinida com sucesso.' })
  })

  // ── Step 1: email ─────────────────────────────────────────────────────────

  it('exibe o formulário de email no step 1', () => {
    renderPage()
    expect(screen.getByTestId('forgot-email-input')).toBeInTheDocument()
    expect(screen.getByTestId('forgot-submit-button')).toBeInTheDocument()
  })

  it('valida email vazio ao submeter', async () => {
    renderPage()
    fireEvent.click(screen.getByTestId('forgot-submit-button'))
    await waitFor(() => expect(screen.getByText('Email é obrigatório')).toBeInTheDocument())
    expect(requestPasswordResetMock).not.toHaveBeenCalled()
  })

  it('valida email inválido ao submeter', async () => {
    renderPage()
    fireEvent.change(screen.getByTestId('forgot-email-input'), { target: { value: 'nao-eh-email' } })
    fireEvent.click(screen.getByTestId('forgot-submit-button'))
    await waitFor(() => expect(screen.getByText('Digite um email válido')).toBeInTheDocument())
    expect(requestPasswordResetMock).not.toHaveBeenCalled()
  })

  it('avança para o step 2 após envio de email com sucesso', async () => {
    renderPage()
    fireEvent.change(screen.getByTestId('forgot-email-input'), { target: { value: 'cliente@rodando.local' } })
    fireEvent.click(screen.getByTestId('forgot-submit-button'))

    await waitFor(() =>
      expect(requestPasswordResetMock).toHaveBeenCalledWith('cliente@rodando.local'),
    )
    await waitFor(() => expect(screen.getByTestId('forgot-code-input')).toBeInTheDocument())
  })

  it('exibe erro da API no step 1', async () => {
    requestPasswordResetMock.mockRejectedValue(new ApiError('Muitas tentativas.', 429))
    renderPage()
    fireEvent.change(screen.getByTestId('forgot-email-input'), { target: { value: 'cliente@rodando.local' } })
    fireEvent.click(screen.getByTestId('forgot-submit-button'))

    await waitFor(() => expect(screen.getByText('Muitas tentativas.')).toBeInTheDocument())
    expect(screen.getByTestId('forgot-email-input')).toBeInTheDocument()
  })

  it('exibe devCode no step 2 quando email não está configurado', async () => {
    requestPasswordResetMock.mockResolvedValue({ message: 'ok', devCode: '123456' })
    renderPage()
    fireEvent.change(screen.getByTestId('forgot-email-input'), { target: { value: 'dev@rodando.local' } })
    fireEvent.click(screen.getByTestId('forgot-submit-button'))

    await waitFor(() => expect(screen.getByText('123456')).toBeInTheDocument())
    expect(screen.getByText(/Modo dev/i)).toBeInTheDocument()
  })

  // ── Step 2: código + nova senha ──────────────────────────────────────────

  async function goToStep2(email = 'cliente@rodando.local') {
    renderPage()
    fireEvent.change(screen.getByTestId('forgot-email-input'), { target: { value: email } })
    fireEvent.click(screen.getByTestId('forgot-submit-button'))
    await waitFor(() => expect(screen.getByTestId('forgot-code-input')).toBeInTheDocument())
  }

  it('valida código vazio no step 2', async () => {
    await goToStep2()
    fireEvent.click(screen.getByTestId('forgot-confirm-button'))
    await waitFor(() =>
      expect(screen.getByText('Informe o código de 6 dígitos recebido por email')).toBeInTheDocument(),
    )
    expect(confirmPasswordResetMock).not.toHaveBeenCalled()
  })

  it('valida senha curta no step 2', async () => {
    await goToStep2()
    fireEvent.change(screen.getByTestId('forgot-code-input'), { target: { value: '123456' } })
    fireEvent.change(screen.getByTestId('forgot-password-input'), { target: { value: '123' } })
    fireEvent.change(screen.getByTestId('forgot-confirm-input'), { target: { value: '123' } })
    fireEvent.click(screen.getByTestId('forgot-confirm-button'))

    await waitFor(() =>
      expect(screen.getByText('Senha deve ter pelo menos 6 caracteres')).toBeInTheDocument(),
    )
    expect(confirmPasswordResetMock).not.toHaveBeenCalled()
  })

  it('valida senhas que não coincidem no step 2', async () => {
    await goToStep2()
    fireEvent.change(screen.getByTestId('forgot-code-input'), { target: { value: '123456' } })
    fireEvent.change(screen.getByTestId('forgot-password-input'), { target: { value: 'senha123' } })
    fireEvent.change(screen.getByTestId('forgot-confirm-input'), { target: { value: 'outrasenha' } })
    fireEvent.click(screen.getByTestId('forgot-confirm-button'))

    await waitFor(() => expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument())
    expect(confirmPasswordResetMock).not.toHaveBeenCalled()
  })

  it('confirma redefinição com sucesso e exibe step done', async () => {
    await goToStep2()
    fireEvent.change(screen.getByTestId('forgot-code-input'), { target: { value: '654321' } })
    fireEvent.change(screen.getByTestId('forgot-password-input'), { target: { value: 'novaSenha1' } })
    fireEvent.change(screen.getByTestId('forgot-confirm-input'), { target: { value: 'novaSenha1' } })
    fireEvent.click(screen.getByTestId('forgot-confirm-button'))

    await waitFor(() =>
      expect(confirmPasswordResetMock).toHaveBeenCalledWith('cliente@rodando.local', '654321', 'novaSenha1'),
    )
    await waitFor(() => expect(screen.getByText('Senha redefinida!')).toBeInTheDocument())
  })

  it('step done exibe mensagem de sucesso e link para o login', async () => {
    await goToStep2()
    fireEvent.change(screen.getByTestId('forgot-code-input'), { target: { value: '654321' } })
    fireEvent.change(screen.getByTestId('forgot-password-input'), { target: { value: 'novaSenha1' } })
    fireEvent.change(screen.getByTestId('forgot-confirm-input'), { target: { value: 'novaSenha1' } })
    fireEvent.click(screen.getByTestId('forgot-confirm-button'))

    await waitFor(() => expect(screen.getByText('Senha redefinida!')).toBeInTheDocument())
    // Link manual disponível enquanto timer não dispara
    expect(screen.getByText('Ir para o login agora').closest('a')).toHaveAttribute('href', '/auth')
  })

  it('exibe erro da API no step 2 com botão de novo código quando expirado', async () => {
    confirmPasswordResetMock.mockRejectedValue(
      new ApiError('Codigo expirado ou ja utilizado. Solicite um novo.', 400),
    )
    await goToStep2()
    fireEvent.change(screen.getByTestId('forgot-code-input'), { target: { value: '000000' } })
    fireEvent.change(screen.getByTestId('forgot-password-input'), { target: { value: 'novaSenha1' } })
    fireEvent.change(screen.getByTestId('forgot-confirm-input'), { target: { value: 'novaSenha1' } })
    fireEvent.click(screen.getByTestId('forgot-confirm-button'))

    await waitFor(() =>
      expect(screen.getByText(/expirado/i)).toBeInTheDocument(),
    )
    expect(screen.getByText('Solicitar novo código')).toBeInTheDocument()
  })

  it('volta para step 1 ao clicar em "Alterar email"', async () => {
    await goToStep2()
    fireEvent.click(screen.getByText('Alterar email'))
    expect(screen.getByTestId('forgot-email-input')).toBeInTheDocument()
    expect(screen.queryByTestId('forgot-code-input')).not.toBeInTheDocument()
  })
})
