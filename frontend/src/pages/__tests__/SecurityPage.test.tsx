import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import SecurityPage from '../SecurityPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { ApiError } from '../../shared/lib/api'

const { requestPasswordChangeCodeMock, confirmPasswordChangeMock, useAuthMock } = vi.hoisted(() => ({
  requestPasswordChangeCodeMock: vi.fn(),
  confirmPasswordChangeMock: vi.fn(),
  useAuthMock: vi.fn(),
}))

vi.mock('../../shared/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared/lib/api')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      requestPasswordChangeCode: requestPasswordChangeCodeMock,
      confirmPasswordChange: confirmPasswordChangeMock,
    },
  }
})

vi.mock('../../shared/context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}))

const AUTHED_USER = {
  id: 1,
  name: 'Cliente Teste',
  email: 'cliente@rodando.local',
  role: 'customer' as const,
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/account/security" element={<SecurityPage />} />
      <Route path="/auth" element={<div data-testid="auth-page" />} />
    </Routes>,
    { initialEntries: ['/account/security'] },
  )
}

describe('SecurityPage', () => {
  beforeEach(() => {
    requestPasswordChangeCodeMock.mockReset().mockResolvedValue({ message: 'Codigo enviado.' })
    confirmPasswordChangeMock.mockReset().mockResolvedValue({ message: 'Senha alterada com sucesso.' })
    useAuthMock.mockReturnValue({ status: 'authenticated', user: AUTHED_USER })
  })

  // ── Autenticação ─────────────────────────────────────────────────────────

  it('exibe skeleton de carregamento enquanto status é loading', () => {
    useAuthMock.mockReturnValue({ status: 'loading', user: null })
    renderPage()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('exibe card de login para usuário não autenticado', () => {
    useAuthMock.mockReturnValue({ status: 'unauthenticated', user: null })
    renderPage()
    expect(screen.getByText('Faça login para gerenciar sua senha.')).toBeInTheDocument()
    expect(screen.getByText('Entrar')).toBeInTheDocument()
  })

  it('link de login aponta para /auth com returnTo correto', () => {
    useAuthMock.mockReturnValue({ status: 'unauthenticated', user: null })
    renderPage()
    const link = screen.getByText('Entrar').closest('a')
    expect(link).toHaveAttribute('href', '/auth?returnTo=/account/security')
  })

  // ── Step idle ─────────────────────────────────────────────────────────────

  it('exibe o email do usuário no step idle', () => {
    renderPage()
    expect(screen.getByText('cliente@rodando.local')).toBeInTheDocument()
  })

  it('exibe o botão "Enviar código por email" no step idle', () => {
    renderPage()
    expect(screen.getByText('Enviar código por email')).toBeInTheDocument()
  })

  it('avança para step code após envio com sucesso', async () => {
    renderPage()
    fireEvent.click(screen.getByText('Enviar código por email'))

    await waitFor(() => expect(requestPasswordChangeCodeMock).toHaveBeenCalledOnce())
    await waitFor(() => expect(screen.getByPlaceholderText('000000')).toBeInTheDocument())
  })

  it('exibe erro ao falhar no envio de código', async () => {
    requestPasswordChangeCodeMock.mockRejectedValue(new ApiError('Muitas tentativas.', 429))
    renderPage()
    fireEvent.click(screen.getByText('Enviar código por email'))

    await waitFor(() => expect(screen.getByText('Muitas tentativas.')).toBeInTheDocument())
    expect(screen.getByText('Enviar código por email')).toBeInTheDocument()
  })

  it('exibe devCode quando email não está configurado', async () => {
    requestPasswordChangeCodeMock.mockResolvedValue({ message: 'ok', devCode: '999888' })
    renderPage()
    fireEvent.click(screen.getByText('Enviar código por email'))

    await waitFor(() => expect(screen.getByText('999888')).toBeInTheDocument())
    expect(screen.getByText(/Modo dev/i)).toBeInTheDocument()
  })

  // ── Step code ─────────────────────────────────────────────────────────────

  async function goToStepCode() {
    renderPage()
    fireEvent.click(screen.getByText('Enviar código por email'))
    await waitFor(() => expect(screen.getByPlaceholderText('000000')).toBeInTheDocument())
  }

  it('valida código de 6 dígitos vazio', async () => {
    await goToStepCode()
    fireEvent.click(screen.getByText('Alterar senha'))
    await waitFor(() =>
      expect(screen.getByText('Informe o código de 6 dígitos recebido por email')).toBeInTheDocument(),
    )
    expect(confirmPasswordChangeMock).not.toHaveBeenCalled()
  })

  it('valida nova senha curta', async () => {
    await goToStepCode()
    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } })
    // senha "abc" tem 3 chars — menor que 6
    const [pwNew] = screen.getAllByRole('textbox', { hidden: true }).filter(
      (el) => (el as HTMLInputElement).autocomplete === 'new-password',
    )
    fireEvent.change(pwNew ?? screen.getAllByDisplayValue('')[0], { target: { value: 'abc' } })
    fireEvent.click(screen.getByText('Alterar senha'))
    await waitFor(() =>
      expect(screen.getByText('A nova senha deve ter pelo menos 6 caracteres')).toBeInTheDocument(),
    )
    expect(confirmPasswordChangeMock).not.toHaveBeenCalled()
  })

  it('confirma alteração de senha com sucesso e exibe step done', async () => {
    await goToStepCode()

    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '654321' } })

    const passwordInputs = document.querySelectorAll('input[type="password"]')
    fireEvent.change(passwordInputs[0], { target: { value: 'novaSenha1' } })
    fireEvent.change(passwordInputs[1], { target: { value: 'novaSenha1' } })

    fireEvent.click(screen.getByText('Alterar senha'))

    await waitFor(() =>
      expect(confirmPasswordChangeMock).toHaveBeenCalledWith('654321', 'novaSenha1'),
    )
    await waitFor(() => expect(screen.getByText('Senha alterada com sucesso!')).toBeInTheDocument())
  })

  it('exibe erro da API no step code', async () => {
    confirmPasswordChangeMock.mockRejectedValue(
      new ApiError('Codigo invalido. 4 tentativa(s) restante(s).', 400),
    )
    await goToStepCode()

    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '000000' } })
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    fireEvent.change(passwordInputs[0], { target: { value: 'novaSenha1' } })
    fireEvent.change(passwordInputs[1], { target: { value: 'novaSenha1' } })
    fireEvent.click(screen.getByText('Alterar senha'))

    await waitFor(() =>
      expect(screen.getByText(/4 tentativa/i)).toBeInTheDocument(),
    )
  })

  it('exibe botão "Solicitar novo código" ao receber erro de tentativas esgotadas', async () => {
    confirmPasswordChangeMock.mockRejectedValue(
      new ApiError('Muitas tentativas incorretas. Solicite um novo codigo.', 400),
    )
    await goToStepCode()

    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '000000' } })
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    fireEvent.change(passwordInputs[0], { target: { value: 'novaSenha1' } })
    fireEvent.change(passwordInputs[1], { target: { value: 'novaSenha1' } })
    fireEvent.click(screen.getByText('Alterar senha'))

    await waitFor(() => expect(screen.getByText('Solicitar novo código')).toBeInTheDocument())
  })

  it('volta para step idle ao clicar em Cancelar', async () => {
    await goToStepCode()
    fireEvent.click(screen.getByText('Cancelar'))
    expect(screen.getByText('Enviar código por email')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('000000')).not.toBeInTheDocument()
  })

  // ── Step done ─────────────────────────────────────────────────────────────

  it('permite alterar senha novamente via botão "Alterar novamente"', async () => {
    await goToStepCode()

    fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '654321' } })
    const passwordInputs = document.querySelectorAll('input[type="password"]')
    fireEvent.change(passwordInputs[0], { target: { value: 'novaSenha1' } })
    fireEvent.change(passwordInputs[1], { target: { value: 'novaSenha1' } })
    fireEvent.click(screen.getByText('Alterar senha'))

    await waitFor(() => expect(screen.getByText('Alterar novamente')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Alterar novamente'))
    expect(screen.getByText('Enviar código por email')).toBeInTheDocument()
  })
})
