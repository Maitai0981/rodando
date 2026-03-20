import TextField from '@mui/material/TextField'
import type { ComponentProps } from 'react'
import type { InputProps } from '../types'

export function Input({ label, hint, error, requiredMark = false, required, ...props }: InputProps) {
  const finalLabel = requiredMark && label ? `${label} *` : label
  const textFieldProps = props as unknown as ComponentProps<typeof TextField>
  return (
    <TextField
      {...textFieldProps}
      label={finalLabel}
      required={required || requiredMark}
      error={Boolean(error)}
      helperText={error || hint || ' '}
      fullWidth
      size="small"
    />
  )
}
