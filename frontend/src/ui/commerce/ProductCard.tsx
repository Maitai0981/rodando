import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Button } from '../primitives/Button'
import { Card } from '../primitives/Card'
import { Price } from '../primitives/Price'
import { Badge } from '../primitives/Badge'
import { ResponsiveImage } from '../primitives/ResponsiveImage'
import type { ProductCardProps } from '../types'

export function ProductCard({ product, onAddToCart, onOpenDetails, loading = false, testIdPrefix = 'catalog' }: ProductCardProps) {
  const hasDiscount = Number(product.discountPercent || 0) > 0
  const urgency = Number(product.stock || 0) <= 3 ? 'Ultimas unidades' : null

  return (
    <Card variant="surface" interactive sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack spacing={1.1} sx={{ height: '100%' }}>
        <Box
          sx={{
            position: 'relative',
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            height: { xs: 180, md: 210 },
            bgcolor: 'grey.100',
          }}
        >
          <ResponsiveImage
            src={product.imageUrl}
            alt={product.name}
            sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
            sx={{ transition: 'transform 180ms ease' }}
          />
        </Box>

        <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
          <Badge label={product.category} tone="neutral" />
          {hasDiscount ? <Badge label={`${product.discountPercent}% OFF`} tone="gold" /> : null}
          {urgency ? <Badge label={urgency} tone="warning" /> : null}
        </Stack>

        <Stack spacing={0.35}>
          <Typography component="p" variant="h6" sx={{ lineHeight: 1.1 }}>
            {product.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {product.manufacturer} • {product.bikeModel}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }}>
            {product.description}
          </Typography>
        </Stack>

        <Price amount={Number(product.price)} compareAt={product.compareAtPrice} />
        <Typography variant="caption" color="text.secondary">SKU: {product.sku}</Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 'auto' }}>
          <Button
            data-testid={`${testIdPrefix}-add-${product.id}`}
            variant="primary"
            fullWidth
            loading={loading}
            disabled={Number(product.stock) <= 0}
            onClick={onAddToCart}
          >
            {Number(product.stock) > 0 ? 'Adicionar' : 'Sem estoque'}
          </Button>
          <Button variant="outline" fullWidth onClick={onOpenDetails}>
            Ver detalhes
          </Button>
        </Stack>
      </Stack>
    </Card>
  )
}
