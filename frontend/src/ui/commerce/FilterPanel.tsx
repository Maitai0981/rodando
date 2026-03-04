import Stack from '@mui/material/Stack'
import type { ReactNode } from 'react'
import { Card } from '../primitives/Card'

export function FilterPanel({
  children,
  actions,
}: {
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <Card variant="surface" sx={{ p: 2 }}>
      <Stack spacing={1.6}>
        {children}
        {actions}
      </Stack>
    </Card>
  )
}
