import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { formatCurrency } from '../../lib'

export function Price({
  amount,
  compareAt,
  size = 'h5',
}: {
  amount: number
  compareAt?: number | null
  size?: 'h4' | 'h5' | 'h6' | 'body1'
}) {
  const showCompareAt = typeof compareAt === 'number' && compareAt > amount
  return (
    <Stack direction="row" alignItems="baseline" spacing={1}>
      <Typography variant={size} sx={{ color: 'info.main', fontWeight: 700 }}>
        {formatCurrency(Number(amount || 0))}
      </Typography>
      {showCompareAt ? (
        <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
          {formatCurrency(Number(compareAt))}
        </Typography>
      ) : null}
    </Stack>
  )
}
