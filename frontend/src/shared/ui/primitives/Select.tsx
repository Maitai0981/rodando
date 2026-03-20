import FormControl from '@mui/material/FormControl'
import FormHelperText from '@mui/material/FormHelperText'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import MuiSelect from '@mui/material/Select'
import type { ComponentProps } from 'react'
import type { SelectProps } from '../types'

export function Select({
  label,
  hint,
  error,
  options,
  required,
  requiredMark = false,
  id,
  ...props
}: SelectProps & { requiredMark?: boolean }) {
  const labelId = `${id || props.name || 'select'}-label`
  const finalLabel = requiredMark && label ? `${label} *` : label
  const selectProps = props as unknown as ComponentProps<typeof MuiSelect>

  return (
    <FormControl fullWidth size="small" error={Boolean(error)}>
      {label ? <InputLabel id={labelId}>{finalLabel}</InputLabel> : null}
      <MuiSelect
        {...selectProps}
        id={id}
        labelId={label ? labelId : undefined}
        label={label ? finalLabel : undefined}
        required={required || requiredMark}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>
      <FormHelperText>{error || hint || ' '}</FormHelperText>
    </FormControl>
  )
}
