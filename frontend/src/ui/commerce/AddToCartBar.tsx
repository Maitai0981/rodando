import Stack from '@mui/material/Stack'
import { Button } from '../primitives/Button'
import { Price } from '../primitives/Price'

export function AddToCartBar({
  price,
  compareAtPrice,
  disabled,
  loading,
  onAddToCart,
  onBuyNow,
}: {
  price: number
  compareAtPrice?: number | null
  disabled?: boolean
  loading?: boolean
  onAddToCart: () => void
  onBuyNow?: () => void
}) {
  return (
    <Stack spacing={1.2}>
      <Price amount={price} compareAt={compareAtPrice} size="h4" />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button variant="primary" fullWidth onClick={onAddToCart} disabled={disabled} loading={loading}>
          Adicionar ao carrinho
        </Button>
        {onBuyNow ? (
          <Button variant="gold" fullWidth onClick={onBuyNow} disabled={disabled}>
            Comprar agora
          </Button>
        ) : null}
      </Stack>
    </Stack>
  )
}
