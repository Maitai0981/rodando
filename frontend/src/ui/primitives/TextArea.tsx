import TextField from '@mui/material/TextField'
import type { ComponentProps, TextareaHTMLAttributes } from 'react'

type TextAreaProps = {
  label?: string
  hint?: string
  error?: string
  minRows?: number
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'>

export function TextArea({ label, hint, error, minRows = 3, ...props }: TextAreaProps) {
  const textFieldProps = props as unknown as ComponentProps<typeof TextField>
  return (
    <TextField
      {...textFieldProps}
      multiline
      minRows={minRows}
      label={label}
      error={Boolean(error)}
      helperText={error || hint || ' '}
      fullWidth
      size="small"
    />
  )
}
