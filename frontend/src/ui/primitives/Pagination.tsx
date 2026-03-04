import MuiPagination from '@mui/material/Pagination'
import Stack from '@mui/material/Stack'
import type { PaginationProps } from '../types'

export function Pagination({ page, totalPages, onChange, disabled = false }: PaginationProps) {
  return (
    <Stack alignItems="center">
      <MuiPagination
        count={Math.max(totalPages, 1)}
        page={Math.max(page, 1)}
        onChange={(_event, nextPage) => onChange(nextPage)}
        color="primary"
        shape="rounded"
        disabled={disabled}
      />
    </Stack>
  )
}
