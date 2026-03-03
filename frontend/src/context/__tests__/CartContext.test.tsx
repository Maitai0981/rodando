import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { CartProvider, useCart } from '../CartContext'
import { api } from '../../lib/api'

vi.mock('../AuthContext', () => ({
  useAuth: () => ({ status: 'authenticated' }),
}))

function Consumer() {
  const { itemCount, total, addProduct, clear } = useCart()
  return (
    <div>
      <p data-testid="cart-count">{itemCount}</p>
      <p data-testid="cart-total">{total}</p>
      <button
        onClick={() =>
          void addProduct(
            {
              id: 9,
              name: 'Produto',
              sku: 'SKU',
              manufacturer: 'QA',
              category: 'Teste',
              bikeModel: 'CG',
              price: 10,
              stock: 3,
              imageUrl: '/img',
              description: 'desc',
              isActive: 1,
              createdAt: '',
              updatedAt: '',
            },
            1,
          )
        }
      >
        add
      </button>
      <button onClick={() => void clear()}>clear</button>
    </div>
  )
}

function Wrapper({ children }: PropsWithChildren) {
  return <CartProvider>{children}</CartProvider>
}

describe('CartContext', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('carrega mochila e executa add/clear', async () => {
    vi.spyOn(api, 'getBag').mockResolvedValue({ items: [], total: 0 })
    vi.spyOn(api, 'addBagItem').mockResolvedValue({
      items: [
        {
          productId: 9,
          quantity: 1,
          name: 'Produto',
          sku: 'SKU',
          manufacturer: 'QA',
          category: 'Teste',
          bikeModel: 'CG',
          price: 10,
          stock: 3,
          imageUrl: '/img',
          description: 'desc',
          isActive: 1,
        },
      ],
    })
    vi.spyOn(api, 'clearBag').mockResolvedValue(undefined)

    render(<Consumer />, { wrapper: Wrapper })

    await waitFor(() => expect(screen.getByTestId('cart-count')).toHaveTextContent('0'))

    fireEvent.click(screen.getByRole('button', { name: 'add' }))
    await waitFor(() => expect(screen.getByTestId('cart-count')).toHaveTextContent('1'))

    fireEvent.click(screen.getByRole('button', { name: 'clear' }))
    await waitFor(() => expect(screen.getByTestId('cart-count')).toHaveTextContent('0'))
  })
})
