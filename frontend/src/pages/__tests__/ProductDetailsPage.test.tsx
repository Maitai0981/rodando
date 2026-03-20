import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import ProductDetailsPage from '../ProductDetailsPage'
import { renderWithProviders } from '../../test/renderWithProviders'
import { api } from '../../shared/lib/api'

// vi.hoisted allows the mock factory to reference these variables
const { useAuthMock } = vi.hoisted(() => {
  const useAuthMock = vi.fn()
  return { useAuthMock }
})

vi.mock('../../shared/context/CartContext', () => ({
  useCart: () => ({ addProduct: addProductMock, itemCount: 0, items: [] }),
}))

vi.mock('../../shared/context/AuthContext', () => ({
  useAuth: useAuthMock,
}))

vi.mock('../../shared/common/ImageWithFallback', () => ({
  ImageWithFallback: ({ alt }: { alt: string }) => <img alt={alt} />,
}))

vi.mock('../../shared/hooks/useRecentlyViewed', () => ({
  trackView: vi.fn(),
  getRecentlyViewed: vi.fn(() => []),
}))

vi.mock('../../shared/lib', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../shared/lib')>()
  return { ...mod, copyTextToClipboard: vi.fn().mockResolvedValue(undefined) }
})

const addProductMock = vi.fn()

function makeProductDetail() {
  return {
    item: {
      id: 7,
      name: 'Kit Transmissão CG',
      sku: 'KIT-TX-001',
      manufacturer: 'Rodando',
      category: 'Transmissão',
      bikeModel: 'CG 160',
      price: 249.9,
      stock: 5,
      imageUrl: '/img/kit.jpg',
      description: 'Kit completo de transmissão',
      isActive: true,
      createdAt: '',
      updatedAt: '',
    },
    gallery: { mainUrl: '/img/kit-main.jpg', thumbUrls: [] },
    pricing: {
      price: 249.9,
      compareAtPrice: 299.9,
      discountPercent: 17,
    },
    compatibility: {
      bikeModel: 'CG 160',
      fitments: [{ label: 'CG 160 Start', value: 'cg160-start' }],
    },
    socialProof: {
      averageRating: 4.6,
      totalReviews: 14,
    },
  }
}

const getPublicProductMock = vi.spyOn(api, 'getPublicProduct')
const listPublicProductsMock = vi.spyOn(api, 'listPublicProducts')
const listCommentsMock = vi.spyOn(api, 'listComments')
const createCommentMock = vi.spyOn(api, 'createComment')

describe('ProductDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAuthMock.mockReturnValue({ status: 'authenticated', user: null })
    getPublicProductMock.mockResolvedValue(makeProductDetail())
    listPublicProductsMock.mockResolvedValue({ items: [] })
    listCommentsMock.mockResolvedValue({ items: [], summary: { averageRating: 0, totalReviews: 0 } })
  })

  function renderProduct(idSlug = '7-kit-transmissao-cg') {
    return renderWithProviders(
      <Routes>
        <Route path="/produto/:idSlug" element={<ProductDetailsPage />} />
        <Route path="/produto/" element={<ProductDetailsPage />} />
      </Routes>,
      { initialEntries: [`/produto/${idSlug}`] },
    )
  }

  it('exibe produto inválido para idSlug não numérico', () => {
    renderProduct('abc')
    expect(screen.getByText('Produto inválido.')).toBeInTheDocument()
  })

  it('exibe nome e fabricante do produto carregado', async () => {
    renderProduct()
    expect(await screen.findByText('Kit Transmissão CG')).toBeInTheDocument()
    expect(screen.getByText(/Rodando/)).toBeInTheDocument()
  })

  it('exibe badge de desconto quando há desconto', async () => {
    renderProduct()
    expect(await screen.findByText(/17%\s*OFF/i)).toBeInTheDocument()
  })

  it('exibe rating e total de avaliações', async () => {
    renderProduct()
    expect(await screen.findByText(/4\.6/)).toBeInTheDocument()
    expect(screen.getByText(/14 comentario/i)).toBeInTheDocument()
  })

  it('exibe preço principal e riscado', async () => {
    renderProduct()
    expect(await screen.findByText(/249/)).toBeInTheDocument()
    expect(screen.getByText(/299/)).toBeInTheDocument()
  })

  it('chama addProduct ao clicar em Adicionar ao carrinho', async () => {
    const user = userEvent.setup()
    renderProduct()
    const btn = await screen.findByRole('button', { name: /adicionar ao carrinho/i })
    await user.click(btn)
    expect(addProductMock).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }), 1)
  })

  it('incrementa quantidade ao clicar em aumentar', async () => {
    const user = userEvent.setup()
    renderProduct()
    await screen.findByText('Kit Transmissão CG')
    const incrementBtn = screen.getByRole('button', { name: /aumentar quantidade/i })
    await user.click(incrementBtn)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('não decrementa quantidade abaixo de 1', async () => {
    const user = userEvent.setup()
    renderProduct()
    await screen.findByText('Kit Transmissão CG')
    const decrementBtn = screen.getByRole('button', { name: /diminuir quantidade/i })
    await user.click(decrementBtn)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('exibe select de compatibilidade com fitments da API', async () => {
    renderProduct()
    expect(await screen.findByRole('combobox', { name: /compatibilidade/i })).toBeInTheDocument()
    expect(screen.getByText('CG 160 Start')).toBeInTheDocument()
  })

  it('exibe link para voltar ao catálogo', async () => {
    renderProduct()
    expect(await screen.findByText(/voltar ao catálogo/i)).toBeInTheDocument()
  })

  // Feature 1: Low Stock Warning
  it('exibe badge de estoque baixo quando stock <= 5', async () => {
    renderProduct()
    const badge = await screen.findByTestId('low-stock-badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('Últimas 5 unidades')
  })

  it('não exibe badge de estoque baixo quando stock > 5', async () => {
    getPublicProductMock.mockResolvedValue({
      ...makeProductDetail(),
      item: { ...makeProductDetail().item, stock: 10 },
    })
    renderProduct()
    await screen.findByText('Kit Transmissão CG')
    expect(screen.queryByTestId('low-stock-badge')).not.toBeInTheDocument()
  })

  // Feature 4: Product Sharing
  it('exibe botão de compartilhar', async () => {
    renderProduct()
    await screen.findByText('Kit Transmissão CG')
    expect(screen.getByTestId('share-button')).toBeInTheDocument()
  })

  it('exibe feedback de link copiado ao compartilhar', async () => {
    const user = userEvent.setup()
    renderProduct()
    await screen.findByText('Kit Transmissão CG')
    await user.click(screen.getByTestId('share-button'))
    expect(await screen.findByTestId('share-copied-feedback')).toBeInTheDocument()
  })

  // Feature 2: Product Reviews — existing reviews
  it('exibe avaliações existentes do produto', async () => {
    listCommentsMock.mockResolvedValue({
      items: [
        {
          id: 1,
          userId: 10,
          productId: 7,
          authorName: 'João Silva',
          rating: 5,
          message: 'Produto excelente!',
          productName: 'Kit Transmissão CG',
          productImageUrl: '',
          createdAt: '',
          updatedAt: '',
        },
      ],
      summary: { averageRating: 5, totalReviews: 1 },
    })
    renderProduct()
    expect(await screen.findByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('Produto excelente!')).toBeInTheDocument()
  })

  it('exibe formulário de avaliação para usuário autenticado', async () => {
    renderProduct()
    await screen.findByText('Kit Transmissão CG')
    expect(screen.getByPlaceholderText(/sua experiência/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enviar avaliação/i })).toBeInTheDocument()
  })

  it('exibe prompt de login para usuário não autenticado', async () => {
    useAuthMock.mockReturnValue({ status: 'unauthenticated', user: null })
    renderProduct()
    await screen.findByText('Kit Transmissão CG')
    expect(screen.getByText(/faça login/i)).toBeInTheDocument()
  })

  it('chama createComment ao enviar avaliação', async () => {
    const user = userEvent.setup()
    createCommentMock.mockResolvedValue({
      item: { id: 99, userId: 1, productId: 7, authorName: 'Test', rating: 5, message: 'Bom!', productName: '', productImageUrl: '', createdAt: '', updatedAt: '' },
    })
    renderProduct()
    await screen.findByText('Kit Transmissão CG')
    const textarea = screen.getByPlaceholderText(/sua experiência/i)
    await user.type(textarea, 'Ótimo produto!')
    await user.click(screen.getByRole('button', { name: /enviar avaliação/i }))
    expect(createCommentMock).toHaveBeenCalledWith(expect.objectContaining({ productId: 7, message: 'Ótimo produto!' }))
  })

  // Feature 5: Recently Viewed tracking
  it('rastreia produto visualizado via trackView', async () => {
    const { trackView: trackViewMock } = await import('../../shared/hooks/useRecentlyViewed')
    renderProduct()
    await screen.findByText('Kit Transmissão CG')
    expect(trackViewMock).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }))
  })
})
