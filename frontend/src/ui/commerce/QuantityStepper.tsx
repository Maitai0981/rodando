import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Button } from '../primitives/Button'

export function QuantityStepper({
  value,
  min = 1,
  max = 99,
  onChange,
}: {
  value: number
  min?: number
  max?: number
  onChange: (next: number) => void
}) {
  const safeValue = Math.max(min, Math.min(max, value || min))
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Button variant="outline" size="sm" onClick={() => onChange(Math.max(min, safeValue - 1))} disabled={safeValue <= min} aria-label="Diminuir quantidade">
        -
      </Button>
      <Typography sx={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>{safeValue}</Typography>
      <Button variant="outline" size="sm" onClick={() => onChange(Math.min(max, safeValue + 1))} disabled={safeValue >= max} aria-label="Aumentar quantidade">
        +
      </Button>
    </Stack>
  )
}
