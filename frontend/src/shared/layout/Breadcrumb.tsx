import MuiBreadcrumbs from '@mui/material/Breadcrumbs'
import type { ReactNode } from 'react'
import { NavigateNextRoundedIcon } from '@/shared/ui/primitives/Icon'

export function Breadcrumb({ children }: { children: ReactNode }) {
  return (
    <MuiBreadcrumbs separator={<NavigateNextRoundedIcon size="sm" />}>
      {children}
    </MuiBreadcrumbs>
  )
}
