import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AccountProfilePage from '../AccountProfilePage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { api } from '../../shared/lib/api'

const refreshSessionMock = vi.fn()

vi.mock('../../shared/context/AuthContext', () => ({
  useAuth: () => authMock,
}))

vi.mock('../../shared/context/AssistContext', () => ({
  useAssist: () => ({ completeStep: vi.fn(), isStepCompleted: vi.fn(() => false) }),
}))

let authMock = {
  status: 'authenticated',
  user: { name: 'Maria', phone: '41999990000', document: '123.456.789-09' },
  refreshSession: refreshSessionMock,
}

function makeAddress(overrides = {}) {
  return {
    id: 1,
    label: 'Casa',
    cep: '85807080',
    street: 'Rua Paraná',
    number: '100',
    complement: '',
    district: 'Centro',
    city: 'Cascavel',
    state: 'PR',
    reference: '',
    isDefault: true,
    lat: null,
    lng: null,
    ...overrides,
  }
}

const listAddressesMock = vi.spyOn(api, 'listAddresses')
const updateProfileMock = vi.spyOn(api, 'updateProfile')
const createAddressMock = vi.spyOn(api, 'createAddress')
const updateAddressMock = vi.spyOn(api, 'updateAddress')
const deleteAddressMock = vi.spyOn(api, 'deleteAddress')
const setDefaultAddressMock = vi.spyOn(api, 'setDefaultAddress')

describe('AccountProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock = {
      status: 'authenticated',
      user: { name: 'Maria', phone: '41999990000', document: '123.456.789-09' },
      refreshSession: refreshSessionMock,
    }
    listAddressesMock.mockResolvedValue({ items: [] })
    updateProfileMock.mockResolvedValue({ item: { name: 'Maria' } })
    refreshSessionMock.mockResolvedValue(undefined)
    createAddressMock.mockResolvedValue({ item: makeAddress() })
    updateAddressMock.mockResolvedValue({ item: makeAddress() })
    deleteAddressMock.mockResolvedValue({ item: makeAddress() })
    setDefaultAddressMock.mockResolvedValue({ item: makeAddress() })
  })

  it('pede login quando não autenticado', () => {
    authMock = { status: 'unauthenticated', user: null, refreshSession: refreshSessionMock }
    renderWithProviders(<AccountProfilePage />, { initialEntries: ['/account'] })
    expect(screen.getByText('Minha conta')).toBeInTheDocument()
    expect(screen.getByText(/entre para editar/i)).toBeInTheDocument()
  })

  it('pré-preenche campos de perfil com dados do usuário', async () => {
    renderWithProviders(<AccountProfilePage />, { initialEntries: ['/account'] })
    expect(await screen.findByLabelText('Nome')).toHaveValue('Maria')
    expect(screen.getByLabelText('Telefone')).toHaveValue('41999990000')
    expect(screen.getByLabelText('Documento')).toHaveValue('123.456.789-09')
  })

  it('salva perfil e exibe feedback de sucesso', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AccountProfilePage />, { initialEntries: ['/account'] })
    const nameInput = await screen.findByLabelText('Nome')
    await user.clear(nameInput)
    await user.type(nameInput, 'Maria Editada')
    await user.click(screen.getByRole('button', { name: /salvar perfil/i }))
    await waitFor(() =>
      expect(updateProfileMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Maria Editada' }),
      ),
    )
    expect(await screen.findByText(/perfil atualizado com sucesso/i)).toBeInTheDocument()
  })

  it('exibe mensagem quando não há endereços', async () => {
    renderWithProviders(<AccountProfilePage />, { initialEntries: ['/account'] })
    expect(await screen.findByText(/nenhum endereço cadastrado/i)).toBeInTheDocument()
  })

  it('exibe endereços carregados da API', async () => {
    listAddressesMock.mockResolvedValue({ items: [makeAddress()] })
    renderWithProviders(<AccountProfilePage />, { initialEntries: ['/account'] })
    expect(await screen.findByText('Casa')).toBeInTheDocument()
    expect(screen.getByText(/Rua Paraná/)).toBeInTheDocument()
    expect(screen.getByText(/Cascavel/)).toBeInTheDocument()
  })

  it('cria novo endereço ao preencher formulário e salvar', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AccountProfilePage />, { initialEntries: ['/account'] })
    await screen.findByText(/nenhum endereço/i)

    await user.type(screen.getByLabelText('Apelido'), 'Trabalho')
    await user.type(screen.getByLabelText('Rua'), 'Av Brasil')
    await user.click(screen.getByRole('button', { name: /adicionar endereço/i }))

    await waitFor(() =>
      expect(createAddressMock).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'Trabalho', street: 'Av Brasil' }),
      ),
    )
    expect(await screen.findByText(/endereço cadastrado com sucesso/i)).toBeInTheDocument()
  })

  it('permite excluir endereço existente', async () => {
    const user = userEvent.setup()
    listAddressesMock.mockResolvedValue({ items: [makeAddress({ id: 3 })] })
    renderWithProviders(<AccountProfilePage />, { initialEntries: ['/account'] })
    await screen.findByText('Casa')
    await user.click(screen.getByRole('button', { name: /remover/i }))
    await user.click(screen.getByRole('button', { name: /sim, remover/i }))
    await waitFor(() => expect(deleteAddressMock).toHaveBeenCalledWith(3))
    expect(await screen.findByText(/endereço removido/i)).toBeInTheDocument()
  })

  it('carrega endereço para edição ao clicar em Editar', async () => {
    const user = userEvent.setup()
    listAddressesMock.mockResolvedValue({ items: [makeAddress({ id: 5, label: 'Minha Casa' })] })
    renderWithProviders(<AccountProfilePage />, { initialEntries: ['/account'] })
    await screen.findByText('Minha Casa')
    await user.click(screen.getByRole('button', { name: /^editar$/i }))
    expect(screen.getByLabelText('Apelido')).toHaveValue('Minha Casa')
    expect(screen.getByRole('button', { name: /salvar endereço/i })).toBeInTheDocument()
  })

  it('define endereço principal ao clicar em Tornar principal', async () => {
    const user = userEvent.setup()
    listAddressesMock.mockResolvedValue({
      items: [
        makeAddress({ id: 1, isDefault: true }),
        makeAddress({ id: 2, label: 'Trabalho', isDefault: false }),
      ],
    })
    renderWithProviders(<AccountProfilePage />, { initialEntries: ['/account'] })
    await screen.findByText('Trabalho')
    await user.click(screen.getByRole('button', { name: /tornar principal/i }))
    await waitFor(() => expect(setDefaultAddressMock).toHaveBeenCalledWith(2))
  })
})
