import type { ReactNode } from 'react'
import { Box, Grid, IconButton, Paper, Stack, Typography, useMediaQuery } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { ArrowBackRoundedIcon } from '@/ui/primitives/Icon'

type AuthSplitLayoutProps = {
  eyebrow: string
  title: string
  description: string
  heroTitle: string
  heroDescription: string
  heroBackground?: string
  heroPanelTitle: string
  heroPanelText: string
  form: ReactNode
  showBackButton?: boolean
  backTo?: string
  informativePaneVariant?: 'amber' | 'neutral'
  informativeTextTone?: 'dark' | 'light'
}

export default function AuthSplitLayout(props: AuthSplitLayoutProps) {
  const {
    eyebrow,
    title,
    description,
    heroTitle,
    heroDescription,
    heroBackground,
    heroPanelTitle,
    heroPanelText,
    form,
    showBackButton = true,
    backTo = '/',
    informativePaneVariant = 'amber',
    informativeTextTone = 'dark',
  } = props
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isAmberPane = informativePaneVariant === 'amber'
  const informativeBackgroundDesktop =
    heroBackground || (isAmberPane ? 'linear-gradient(180deg, #FFF6DA 0%, #FFF1CC 100%)' : '#F3F4F6')
  const informativeBackground = informativeBackgroundDesktop
  const informativeTextColorDesktop = informativeTextTone === 'light' ? '#F8FAFC' : '#1A2433'
  const informativeSecondaryColorDesktop =
    informativeTextTone === 'light' ? 'rgba(248,250,252,0.84)' : '#3E4E63'
  const informativeTextColor = informativeTextColorDesktop
  const informativeSecondaryColor = informativeSecondaryColorDesktop
  const informativeBorderColor = isAmberPane ? '#E7C878' : '#E5E7EB'
  const informativePanelBg = isAmberPane ? 'rgba(255,255,255,0.9)' : '#FFFFFF'

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F7F5EE' }}>
      <Grid
        container
        sx={{ minHeight: '100vh', bgcolor: '#F7F5EE' }}
      >
        <Grid
          data-testid="auth-informative-pane"
          data-pane-variant={informativePaneVariant}
          size={{ xs: 12, md: 6 }}
          sx={{
            background: informativeBackground,
            color: informativeTextColor,
            p: { xs: 2.2, md: 4.5 },
            display: 'flex',
            alignItems: 'center',
            borderBottom: { xs: '1px solid #D8D3C2', md: 'none' },
            borderRight: { md: `1px solid ${informativeBorderColor}` },
          }}
        >
          <Box
            sx={{
              opacity: 1,
              transform: 'translateX(0)',
              transition: reduceMotion ? 'none' : 'transform 320ms ease, opacity 320ms ease',
            }}
          >
            <Stack spacing={{ xs: 1.5, md: 2.25 }} sx={{ maxWidth: 460 }}>
              <Typography variant="caption" sx={{ color: informativeSecondaryColor, letterSpacing: '0.12em' }}>
                {heroTitle}
              </Typography>
              <Typography
                component="h1"
                variant="h1"
                sx={{
                  color: informativeTextColor,
                  maxWidth: 420,
                }}
              >
                {heroDescription}
              </Typography>
              <Typography variant="body1" sx={{ color: informativeSecondaryColor, maxWidth: 420 }}>
                {description}
              </Typography>
              <Box
                sx={{
                  p: { xs: 1.6, md: 2.2 },
                  borderRadius: 2.5,
                  bgcolor: informativePanelBg,
                  border: `1px solid ${informativeBorderColor}`,
                }}
              >
                <Typography component="p" variant="subtitle2" sx={{ color: informativeTextColor, mb: 0.5 }}>
                  {heroPanelTitle}
                </Typography>
                <Typography variant="body2" sx={{ color: informativeSecondaryColor }}>
                  {heroPanelText}
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Grid>

        <Grid
          size={{ xs: 12, md: 6 }}
          sx={{
            p: { xs: 2.3, md: 4.5 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#F7F5EE',
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: 430,
              opacity: 1,
              transform: 'translateX(0)',
              transition: reduceMotion ? 'none' : 'transform 320ms ease, opacity 320ms ease',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.25, md: 3 },
                width: '100%',
                maxWidth: 430,
                borderRadius: 3,
                border: '1px solid #E5E7EB',
                bgcolor: '#FFFFFF',
                boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
              }}
            >
              {showBackButton ? (
                <IconButton
                  component={RouterLink}
                  to={backTo}
                  aria-label="Voltar para a página inicial"
                  sx={{
                    width: 44,
                    height: 44,
                    mb: 0.4,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ArrowBackRoundedIcon size="md" />
                </IconButton>
              ) : null}
              <Typography variant="caption" color="primary" sx={{ letterSpacing: '0.12em' }} gutterBottom>
                {eyebrow}
              </Typography>
              <Typography component="h2" variant="h3" gutterBottom>
                {title}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {description}
              </Typography>
              {form}
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}
