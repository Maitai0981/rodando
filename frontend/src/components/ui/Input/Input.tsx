import TextField from '@mui/material/TextField'
import type { TextFieldProps } from '@mui/material/TextField'

export type UiInputProps = TextFieldProps

export function UiInput({ fullWidth = true, size = 'medium', ...props }: UiInputProps) {
  return <TextField {...props} fullWidth={fullWidth} size={size} />
}
