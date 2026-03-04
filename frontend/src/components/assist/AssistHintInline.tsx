import {
  Box,
  ClickAwayListener,
  Fade,
  IconButton,
  Paper,
  Popper,
  Stack,
  Typography,
  useMediaQuery,
} from '@mui/material'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { AssistRouteKey } from '../../assist/assistSchema'
import { useAssist } from '../../context/AssistContext'
import { CloseRoundedIcon } from '@/ui/primitives/Icon'

type AssistHintInlineProps = {
  tipId: string
  children: ReactNode
  routeKey?: AssistRouteKey | string
}

export function AssistHintInline({ tipId, children, routeKey }: AssistHintInlineProps) {
  const { enabled, activeRoute, activeRouteState, isRouteFirstVisit, dismissTip } = useAssist()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const tooltipId = useId()
  const isTouchMode = useMediaQuery('(hover: none), (pointer: coarse)')
  const [isHovering, setIsHovering] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isTappedOpen, setIsTappedOpen] = useState(false)
  const targetRouteKey = String(routeKey || activeRoute?.key || '').trim()
  const firstVisitAllowed = isRouteFirstVisit(targetRouteKey)

  const isOpen = isTouchMode ? isTappedOpen : isHovering || isFocused

  const closeTipPopover = useCallback(() => {
    setIsHovering(false)
    setIsFocused(false)
    setIsTappedOpen(false)
  }, [])

  useEffect(() => {
    closeTipPopover()
  }, [closeTipPopover, targetRouteKey, tipId])

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeTipPopover()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeTipPopover, isOpen])

  if (!enabled || !targetRouteKey || !firstVisitAllowed || activeRouteState.dismissedTips.includes(tipId)) return null

  return (
    <ClickAwayListener onClickAway={closeTipPopover}>
      <Box sx={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}>
        <IconButton
          ref={triggerRef}
          size="small"
          data-testid={`assist-hint-trigger-${tipId}`}
          aria-label="Abrir dica assistida"
          aria-describedby={isOpen ? tooltipId : undefined}
          aria-expanded={isOpen}
          aria-controls={isOpen ? tooltipId : undefined}
          onMouseEnter={() => {
            if (!isTouchMode) setIsHovering(true)
          }}
          onMouseLeave={() => {
            if (!isTouchMode) setIsHovering(false)
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            if (!isTouchMode) setIsFocused(false)
          }}
          onClick={() => {
            if (isTouchMode) {
              setIsTappedOpen((prev) => !prev)
              return
            }
            setIsFocused((prev) => !prev)
          }}
          sx={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.secondary',
            bgcolor: 'background.paper',
            fontWeight: 800,
            fontSize: 12,
            lineHeight: 1,
            '&:hover': {
              borderColor: 'primary.main',
              color: 'primary.main',
              bgcolor: 'rgba(28,156,75,0.08)',
            },
          }}
        >
          ?
        </IconButton>

        <Popper
          id={tooltipId}
          open={isOpen}
          anchorEl={triggerRef.current}
          placement="top-start"
          transition
          disablePortal
          modifiers={[
            { name: 'offset', options: { offset: [0, 10] } },
            { name: 'flip', options: { fallbackPlacements: ['bottom-start'] } },
          ]}
          onMouseEnter={() => {
            if (!isTouchMode) setIsHovering(true)
          }}
          onMouseLeave={() => {
            if (!isTouchMode) setIsHovering(false)
          }}
          sx={{ zIndex: (theme) => theme.zIndex.tooltip + 2 }}
        >
          {({ TransitionProps }) => (
            <Fade {...TransitionProps} timeout={140}>
              <Paper
                role={isTouchMode ? 'dialog' : 'tooltip'}
                elevation={0}
                sx={{
                  p: 1.2,
                  borderRadius: 2.2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  maxWidth: 340,
                  boxShadow: '0 12px 28px rgba(20,34,53,0.18)',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Typography
                    component="div"
                    variant="body2"
                    color="text.secondary"
                    sx={{ flex: 1, pr: 0.5 }}
                  >
                    {children}
                  </Typography>
                  <IconButton
                    size="small"
                    aria-label="Dispensar dica assistida"
                    onClick={() => {
                      dismissTip(tipId, targetRouteKey)
                      closeTipPopover()
                    }}
                    sx={{ mt: -0.25, mr: -0.25 }}
                  >
                    <CloseRoundedIcon size="sm" />
                  </IconButton>
                </Stack>
              </Paper>
            </Fade>
          )}
        </Popper>
      </Box>
    </ClickAwayListener>
  )
}
