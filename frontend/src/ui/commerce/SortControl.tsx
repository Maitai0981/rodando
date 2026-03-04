import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Select } from '../primitives/Select'

export function SortControl({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (next: string) => void
  options: Array<{ label: string; value: string }>
}) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
      <Typography variant="body2" color="text.secondary">Ordenar por</Typography>
      <Select label="Ordenar por" value={value} onChange={(event) => onChange(String(event.target.value))} options={options} />
    </Stack>
  )
}
