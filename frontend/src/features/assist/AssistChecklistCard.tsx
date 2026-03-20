import { CheckCircleRoundedIcon, ExpandLessRoundedIcon, ExpandMoreRoundedIcon, RadioButtonUncheckedRoundedIcon, ReplayRoundedIcon } from '@/shared/ui/primitives/Icon'
import {
  Badge,
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useAssist } from '../../shared/context/AssistContext'

export function AssistChecklistCard() {
  const {
    enabled,
    activeRoute,
    activeRouteState,
    checklistOpen,
    setChecklistOpen,
    completeStep,
    resetAssist,
  } = useAssist()

  if (!enabled || !activeRoute || activeRoute.checklist.length === 0) return null

  const completed = activeRoute.checklist.filter((step) => activeRouteState.checklistState?.[step.id]).length
  const total = activeRoute.checklist.length
  const allDone = total > 0 && completed === total

  return (
    <Box
      data-testid="assist-checklist-card"
      sx={{
        position: 'fixed',
        right: { xs: 12, md: 20 },
        bottom: { xs: 'calc(98px + env(safe-area-inset-bottom, 0px))', md: 20 },
        zIndex: (theme) => theme.zIndex.appBar + 4,
        width: { xs: 'calc(100% - 24px)', sm: 360 },
        maxWidth: 380,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 1.2,
          borderRadius: 2.4,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: '0 10px 24px rgba(15,23,42,0.14)',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Stack spacing={0.2} sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={0.8}>
              <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
                MODO ASSISTIDO
              </Typography>
              <Badge color="primary" badgeContent={`${completed}/${total}`} />
            </Stack>
            <Typography
              variant="subtitle2"
              sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              aria-live="polite"
            >
              {activeRoute.title}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.2}>
            <IconButton
              size="small"
              aria-label={checklistOpen ? 'Recolher checklist assistida' : 'Expandir checklist assistida'}
              onClick={() => setChecklistOpen(!checklistOpen)}
            >
              {checklistOpen ? <ExpandLessRoundedIcon size="sm" /> : <ExpandMoreRoundedIcon size="sm" />}
            </IconButton>
            <IconButton
              size="small"
              aria-label="Resetar progresso assistido"
              onClick={() => {
                void resetAssist()
              }}
            >
              <ReplayRoundedIcon size="sm" />
            </IconButton>
          </Stack>
        </Stack>

        {checklistOpen ? (
          <Stack spacing={0.75} sx={{ mt: 1 }}>
            {activeRoute.checklist.map((step) => {
              const done = Boolean(activeRouteState.checklistState?.[step.id])
              return (
                <Box
                  key={`${activeRoute.key}-${step.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    if (!done) completeStep(step.id, activeRoute.key)
                  }}
                  onKeyDown={(event) => {
                    if (!done && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault()
                      completeStep(step.id, activeRoute.key)
                    }
                  }}
                  sx={{
                    px: 1,
                    py: 0.85,
                    borderRadius: 1.5,
                    border: '1px solid',
                    borderColor: done ? 'success.main' : 'divider',
                    bgcolor: done ? 'rgba(76,175,80,0.10)' : 'transparent',
                    cursor: done ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.8,
                  }}
                >
                  {done ? (
                    <CheckCircleRoundedIcon tone="success" size="md" />
                  ) : (
                    <RadioButtonUncheckedRoundedIcon tone="muted" size="md" />
                  )}
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {step.label}
                  </Typography>
                </Box>
              )
            })}
            {allDone ? (
              <Chip color="success" label="Checklist concluída" size="small" icon={<CheckCircleRoundedIcon size="sm" />} />
            ) : null}
          </Stack>
        ) : null}
      </Paper>
    </Box>
  )
}
