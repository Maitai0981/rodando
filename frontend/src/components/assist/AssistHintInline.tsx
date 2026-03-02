import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import LightbulbRoundedIcon from '@mui/icons-material/LightbulbRounded'
import { Alert, IconButton } from '@mui/material'
import type { ReactNode } from 'react'
import { useAssist } from '../../context/AssistContext'
import type { AssistRouteKey } from '../../assist/assistSchema'

type AssistHintInlineProps = {
  tipId: string
  children: ReactNode
  routeKey?: AssistRouteKey | string
}

export function AssistHintInline({ tipId, children, routeKey }: AssistHintInlineProps) {
  const { enabled, activeRoute, activeRouteState, dismissTip } = useAssist()
  const targetRouteKey = String(routeKey || activeRoute?.key || '').trim()

  if (!enabled || !targetRouteKey || activeRouteState.dismissedTips.includes(tipId)) return null

  return (
    <Alert
      icon={<LightbulbRoundedIcon fontSize="inherit" />}
      severity="info"
      sx={{ borderRadius: 2.2 }}
      action={(
        <IconButton
          size="small"
          aria-label="Fechar dica assistida"
          onClick={() => dismissTip(tipId, targetRouteKey)}
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      )}
    >
      {children}
    </Alert>
  )
}
