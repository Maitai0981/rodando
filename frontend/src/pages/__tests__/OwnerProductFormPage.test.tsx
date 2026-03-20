import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import OwnerProductFormPage from '../OwnerProductFormPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { api } from '../../shared/lib/api'

vi.mock('../../shared/layout/OwnerLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../shared/context/AssistContext', () => ({
  useAssist: () => ({ completeStep: vi.fn(), isRouteFirstVisit: vi.fn(() => false) }),
}))

vi.mock('../../features/assist', () => ({
  AssistHintInline: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}))

function makeProduct(overrides = {}) {
  return {
    id: 10,
    name: 'Corrente 428H',
    sku: 'COR-428H',
    manufacturer: 'DID',
    category: 'Transmissão',
    bikeModel: 'CG 160',
    price: 89.9,
    cost: 40,
    stock: 20,
    minimumStock: 5,
    reorderPoint: 10,
    imageUrl: '/img/corrente.jpg',
    hoverImageUrl: '',
    description: 'Corrente reforçada',
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-02T00:00:00Z',
    ...overrides,
  }
}

const getOwnerProductMock = vi.spyOn(api, 'getOwnerProduct')
const createProductMock = vi.spyOn(api, 'createProduct')
const updateProductMock = vi.spyOn(api, 'updateProduct')

describe('OwnerProductFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getOwnerProductMock.mockResolvedValue({ item: makeProduct() })
    createProductMock.mockResolvedValue({ item: makeProduct({ id: 99 }) })
    updateProductMock.mockResolvedValue({ item: makeProduct() })
  })

  function renderNew() {
    return renderWithProviders(
      <Routes>
        <Route path="/owner/products/new" element={<OwnerProductFormPage />} />
      </Routes>,
      { initialEntries: ['/owner/products/new'] },
    )
  }

  function renderEdit(id = 10) {
    return renderWithProviders(
      <Routes>
        <Route path="/owner/products/:id/edit" element={<OwnerProductFormPage />} />
        <Route path="/owner/products" element={<div>Lista de produtos</div>} />
      </Routes>,
      { initialEntries: [`/owner/products/${id}/edit`] },
    )
  }

  describe('modo criação (/owner/products/new)', () => {
    it('exibe título Novo produto', () => {
      renderNew()
      expect(screen.getByRole('heading', { name: /novo produto/i })).toBeInTheDocument()
    })

    it('exibe formulário vazio', () => {
      renderNew()
      expect(screen.getByTestId('owner-product-name')).toHaveValue('')
      expect(screen.getByTestId('owner-product-sku')).toHaveValue('')
    })

    it('submete payload correto ao criar produto', async () => {
      const user = userEvent.setup()
      renderNew()

      await user.type(screen.getByTestId('owner-product-name'), 'Pastilha de Freio')
      await user.type(screen.getByTestId('owner-product-sku'), 'PAS-001')
      await user.type(screen.getByTestId('owner-product-manufacturer'), 'Cobreq')
      await user.type(screen.getByTestId('owner-product-category'), 'Freios')
      await user.type(screen.getByTestId('owner-product-bike-model'), 'CG 160')
      await user.type(screen.getByTestId('owner-product-price'), '59.9')
      await user.type(screen.getByTestId('owner-product-cost'), '25')
      await user.type(screen.getByTestId('owner-product-stock'), '30')

      await user.click(screen.getByTestId('owner-product-save-button'))

      await waitFor(() =>
        expect(createProductMock).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Pastilha de Freio',
            sku: 'PAS-001',
            manufacturer: 'Cobreq',
            category: 'Freios',
            price: 59.9,
            stock: 30,
          }),
        ),
      )
    })

    it('exibe aviso quando produto ativo não tem imagem', async () => {
      renderNew()
      // checkbox isActive está marcado por padrão, imageUrl vazia → deve exibir aviso
      await screen.findByText(/sem imagem nao pode ser publicado/i)
    })
  })

  describe('modo edição (/owner/products/10/edit)', () => {
    it('carrega e exibe dados do produto', async () => {
      renderEdit()
      expect(await screen.findByDisplayValue('Corrente 428H')).toBeInTheDocument()
      expect(screen.getByDisplayValue('COR-428H')).toBeInTheDocument()
      expect(screen.getByDisplayValue('DID')).toBeInTheDocument()
    })

    it('exibe título Editar produto', async () => {
      renderEdit()
      expect(await screen.findByRole('heading', { name: /editar produto/i })).toBeInTheDocument()
    })

    it('submete update com dados modificados', async () => {
      const user = userEvent.setup()
      renderEdit()
      const nameInput = await screen.findByTestId('owner-product-name')
      await user.clear(nameInput)
      await user.type(nameInput, 'Corrente 520H')

      await user.click(screen.getByTestId('owner-product-save-button'))

      await waitFor(() =>
        expect(updateProductMock).toHaveBeenCalledWith(
          10,
          expect.objectContaining({ name: 'Corrente 520H' }),
        ),
      )
    })

    it('exibe metadados do produto (criado em / atualizado em)', async () => {
      renderEdit()
      expect(await screen.findByText(/metadados/i)).toBeInTheDocument()
      expect(screen.getByText(/criado em/i)).toBeInTheDocument()
    })

    it('converte sku para maiúsculas ao digitar', async () => {
      const user = userEvent.setup()
      renderEdit()
      const skuInput = await screen.findByTestId('owner-product-sku')
      await user.clear(skuInput)
      await user.type(skuInput, 'cor-x99')
      expect(skuInput).toHaveValue('COR-X99')
    })
  })
})
