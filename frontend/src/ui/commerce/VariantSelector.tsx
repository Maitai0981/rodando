import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Select } from '../primitives/Select'

export function VariantSelector({
  label = 'Aplicacao',
  value,
  onChange,
  options,
}: {
  label?: string
  value: string
  onChange: (next: string) => void
  options: Array<{ label: string; value: string }>
}) {
  return (
    <Stack spacing={0.6}>
      <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
      <Select
        label={label}
        value={value}
        onChange={(event) => onChange(String(event.target.value))}
        options={options}
      />
    </Stack>
  )
}
