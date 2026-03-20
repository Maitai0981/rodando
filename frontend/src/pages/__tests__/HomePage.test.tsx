import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HomePage from '../HomePage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { api, type Product } from '../../shared/lib/api'

vi.mock('framer-motion', async (importOriginal) => {
  const mod = await importOriginal<typeof import('framer-motion')>()
  return {
    ...mod,
    m: mod.motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useInView: () => true,
  }
})

const addProductMock = vi.fn()

vi.mock('../../shared/context/CartContext', () => ({
  useCart: () => ({ addProduct: addProductMock, itemCount: 0, items: [] }),
}))

vi.mock('../../shared/context/AssistContext', () => ({
  useAssist: () => ({ completeStep: vi.fn(), isStepCompleted: vi.fn(() => false) }),
}))

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Aro Dianteiro CG',
    sku: 'ARO-001',
    manufacturer: 'Rodando',
    category: 'Rodas',
    bikeModel: 'CG 160',
    price: 149.9,
    stock: 10,
    imageUrl: '/img/aro.jpg',
    description: 'Aro dianteiro original',
    isActive: true,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

const highlightsMock = vi.spyOn(api, 'listCatalogHighlights')
const categoriesMock = vi.spyOn(api, 'listCatalogCategories')
const recommendationsMock = vi.spyOn(api, 'listCatalogRecommendations')
const commentsMock = vi.spyOn(api, 'listComments')

describe('HomePage', () => {
  beforeEach(() => {
    highlightsMock.mockResolvedValue({ items: [makeProduct(), makeProduct({ id: 2, name: 'Kit Corrente' })] })
    categoriesMock.mockResolvedValue({ items: [{ name: 'Transmissão', count: 12 }, { name: 'Rodas', count: 8 }] })
    recommendationsMock.mockResolvedValue({ items: [] })
    commentsMock.mockResolvedValue({ summary: { averageRating: 4.8, totalReviews: 0 }, items: [] })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza links de navegação do hero', async () => {
    renderWithProviders(<HomePage />, { initialEntries: ['/'] })
    const catalogBtn = await screen.findByTestId('home-catalog-cta')
    expect(catalogBtn).toBeInTheDocument()
  })

  it('exibe seção de diferenciais institucionais', async () => {
    renderWithProviders(<HomePage />, { initialEntries: ['/'] })
    expect(await screen.findByText('Loja Física Ativa')).toBeInTheDocument()
    expect(screen.getByText('Entrega Ágil')).toBeInTheDocument()
    expect(screen.getByText('Garantia Real')).toBeInTheDocument()
    expect(screen.getByText('Consultoria Técnica')).toBeInTheDocument()
  })

  it('exibe produtos de destaque carregados da API', async () => {
    renderWithProviders(<HomePage />, { initialEntries: ['/'] })
    expect(await screen.findByText('Aro Dianteiro CG')).toBeInTheDocument()
    expect(screen.getByText('Kit Corrente')).toBeInTheDocument()
  })

  it('exibe categorias carregadas da API', async () => {
    renderWithProviders(<HomePage />, { initialEntries: ['/'] })
    expect(await screen.findByText('Transmissão')).toBeInTheDocument()
    expect(screen.getByText('Rodas')).toBeInTheDocument()
  })

  it('chama addProduct ao clicar em Adicionar em destaque', async () => {
    const user = userEvent.setup()
    renderWithProviders(<HomePage />, { initialEntries: ['/'] })
    const addButtons = await screen.findAllByRole('button', { name: /adicionar/i })
    await user.click(addButtons[0])
    expect(addProductMock).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 1)
  })

  it('exibe nota média quando há avaliações', async () => {
    commentsMock.mockResolvedValue({
      summary: { averageRating: 4.8, totalReviews: 32 },
      items: [{ id: 1, text: 'Ótimo produto', rating: 5, author: 'João', productId: 1, createdAt: '' }],
    })
    renderWithProviders(<HomePage />, { initialEntries: ['/'] })
    expect(await screen.findByText(/Nota média 4\.8/)).toBeInTheDocument()
  })

  it('exibe mensagem sem avaliações quando totalReviews é zero', async () => {
    commentsMock.mockResolvedValue({ summary: { averageRating: 0, totalReviews: 0 }, items: [] })
    renderWithProviders(<HomePage />, { initialEntries: ['/'] })
    expect(await screen.findByText(/0 avaliações/i)).toBeInTheDocument()
  })

  it('exibe rodapé com endereço da loja', async () => {
    renderWithProviders(<HomePage />, { initialEntries: ['/'] })
    const items = await screen.findAllByText(/Cascavel/i)
    expect(items.length).toBeGreaterThan(0)
  })
})
