import { useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, Button, Chip, Divider, Grid, Paper, Stack, Typography } from '@mui/material'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import FacebookRoundedIcon from '@mui/icons-material/FacebookRounded'
import InstagramIcon from '@mui/icons-material/Instagram'
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded'
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded'
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded'
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded'
import type { SvgIconComponent } from '@mui/icons-material'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import PublicLayout from '../layouts/PublicLayout'

const officialLinks = {
  maps:
    'https://www.google.com/maps/place/Rodando+Moto+Center/@-24.9539372,-53.4823137,17z/data=!3m1!4b1!4m6!3m5!1s0x94f3d6abd0f76d39:0x4c1de863cd816ba6!8m2!3d-24.9539372!4d-53.4823137!16s%2Fg%2F1thnpyhg?entry=ttu&g_ep=EgoyMDI2MDIyMi4wIKXMDSoASAFQAw%3D%3D',
  facebook:
    'https://www.facebook.com/people/Rodando-MOTO-Center/100063563260906/?rdid=wT60RblvcFG4P0yO&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F154Nx32j9w%2F',
  instagram: 'https://www.instagram.com/rodandomoto?utm_source=qr&igsh=MWUzd3VvM21rYzk2Mg%3D%3D',
}

const departments = [
  {
    label: 'Fabrica',
    title: 'Fabrique Conosco',
    note: 'Parcerias e operacao industrial.',
    emails: ['ribeiro@rodando.com.br'],
    whatsapp: '+55 45 99959-9898',
    phone: '+55 45 3037-5858',
    tint: 'rgba(0,156,59,0.05)',
  },
  {
    label: 'Distribuicao',
    title: 'Distribuidor Oficial',
    note: 'Atendimento comercial e vendas.',
    emails: ['rodando@rodando.com.br', 'contato@rodando.com.br', 'contact@rodando.com.br', 'vendas@rodando.com.br', 'sales@rodando.com.br'],
    whatsapp: '+55 45 99934-6779',
    phone: '+55 45 3037-5858',
    tint: 'rgba(17,17,17,0.04)',
  },
]

interface QuickLink {
  title: string
  note: string
  href: string
  icon: SvgIconComponent
  color: string
  bgcolor: string
}

const quickLinks: QuickLink[] = [
  { 
    title: 'Catalogo', 
    note: 'Produtos', 
    href: '/catalog',
    icon: StorefrontRoundedIcon,
    color: '#0a8f3a',
    bgcolor: 'rgba(0,156,59,0.08)',
  },
  {
    title: 'Medidas',
    note: 'Tabela tecnica',
    href: '/technical',
    icon: SpeedRoundedIcon,
    color: '#111111',
    bgcolor: 'rgba(17,17,17,0.07)',
  },
  { 
    title: 'Mochila', 
    note: 'Seus itens', 
    href: '/cart',
    icon: ShoppingBagRoundedIcon,
    color: '#b8860b',
    bgcolor: 'rgba(184,134,11,0.08)',
  },
  { 
    title: 'Painel', 
    note: 'Area do lojista', 
    href: '/owner',
    icon: DashboardRoundedIcon,
    color: '#5e35b1',
    bgcolor: 'rgba(94,53,177,0.08)',
  },
]

const storeAddress = 'Av. Brasil, 8708 - Cascavel - PR'
const sectionReveal = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: 'easeOut' },
  },
} as const

const revealItem = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' },
  },
} as const

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function DepartmentCard({
  label,
  title,
  note,
  emails,
  whatsapp,
  phone,
  tint,
}: (typeof departments)[number]) {
  return (
    <motion.div
      variants={revealItem}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 2.25 },
          borderRadius: 2.5,
          height: '100%',
          minHeight: { md: 356 },
          border: '1px solid rgba(12,22,44,0.08)',
          background: `linear-gradient(180deg, ${tint} 0%, rgba(255,255,255,0.98) 64%)`,
        }}
      >
        <Stack spacing={1.4}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Chip
              size="small"
              label={label}
              sx={{
                height: 22,
                fontWeight: 700,
                bgcolor: 'rgba(255,255,255,0.88)',
                border: '1px solid rgba(12,22,44,0.08)',
                color: 'primary.main',
              }}
            />
          </Stack>

          <Box>
            <Typography variant="h6" sx={{ color: 'info.main', letterSpacing: '-0.02em' }}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {note}
            </Typography>
          </Box>

          <Box sx={{ borderRadius: 2, border: '1px solid rgba(12,22,44,0.07)', bgcolor: 'rgba(255,255,255,0.78)', p: 1.15 }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.9, fontWeight: 700, color: 'info.main', letterSpacing: '0.06em' }}>
              CONTATO DIGITAL
            </Typography>
            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
              {emails.map((email) => (
                <Chip
                  key={email}
                  component="a"
                  clickable
                  href={`mailto:${email}`}
                  icon={<EmailOutlinedIcon sx={{ fontSize: 16 }} />}
                  label={email}
                  variant="outlined"
                  sx={{
                    justifyContent: 'flex-start',
                    maxWidth: '100%',
                    height: 30,
                    borderColor: 'rgba(12,22,44,0.08)',
                    bgcolor: 'rgba(255,255,255,0.92)',
                    '& .MuiChip-label': {
                      px: 1,
                      fontSize: '0.78rem',
                      color: 'info.main',
                    },
                    '& .MuiChip-icon': {
                      color: 'primary.main',
                      ml: 0.6,
                      mr: -0.5,
                    },
                    '&:hover': {
                      borderColor: 'rgba(12,22,44,0.18)',
                      bgcolor: 'rgba(255,255,255,0.98)',
                    },
                  }}
                />
              ))}
            </Stack>
          </Box>

          <Stack spacing={0.9}>
            <Button
              component="a"
              href={`https://wa.me/${onlyDigits(whatsapp)}`}
              target="_blank"
              rel="noreferrer"
              variant="outlined"
              color="success"
              startIcon={<WhatsAppIcon />}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                fontWeight: 600,
                borderColor: 'rgba(37,211,102,0.35)',
                bgcolor: 'rgba(37,211,102,0.05)',
                color: '#16673f',
                minHeight: 42,
              }}
            >
              WhatsApp: {whatsapp}
            </Button>
            <Button
              component="a"
              href={`tel:${onlyDigits(phone)}`}
              variant="outlined"
              color="primary"
              startIcon={<PhoneOutlinedIcon />}
              sx={{
                justifyContent: 'flex-start',
                textTransform: 'none',
                fontWeight: 600,
                borderColor: 'rgba(17,17,17,0.14)',
                bgcolor: 'rgba(255,255,255,0.55)',
                minHeight: 42,
              }}
            >
              Fixo: {phone}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </motion.div>
  )
}

function QuickActionCard({ link, index, prefersReducedMotion }: { link: QuickLink; index: number; prefersReducedMotion: boolean }) {
  const IconComponent = link.icon
  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
    >
      <Paper
        component={RouterLink}
        to={link.href}
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: '1px solid rgba(12,22,44,0.08)',
          bgcolor: link.bgcolor,
          textDecoration: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 1,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-3px)',
            boxShadow: '0 8px 24px rgba(17,17,17,0.12)',
          },
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.9)',
            display: 'grid',
            placeItems: 'center',
            border: `1px solid ${link.color}22`,
          }}
        >
          <IconComponent sx={{ fontSize: 26, color: link.color }} />
        </Box>
        <Typography variant="subtitle2" sx={{ color: 'info.main', fontWeight: 600 }}>
          {link.title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {link.note}
        </Typography>
      </Paper>
    </motion.div>
  )
}

export default function HomePage() {
  const prefersReducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const [copiedAddress, setCopiedAddress] = useState(false)
  const heroTranslateY = useTransform(scrollY, [0, 260], [0, prefersReducedMotion ? 0 : -28])
  const heroOpacity = useTransform(scrollY, [0, 260], [1, prefersReducedMotion ? 1 : 0.9])

  async function handleCopyAddress() {
    try {
      await navigator.clipboard.writeText(storeAddress)
      setCopiedAddress(true)
      window.setTimeout(() => setCopiedAddress(false), 1800)
    } catch {
      setCopiedAddress(false)
    }
  }

  function scrollToFeatured() {
    document.getElementById('home-middle')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <PublicLayout>
      <Box
        component="section"
        id="home-top"
        sx={{
          mb: { xs: 1.8, md: 1.25 },
          mt: { xs: -0.4, md: -0.9 },
          position: 'relative',
          minHeight: { xs: 'calc(100svh - 78px)', md: 'calc(100svh - 82px)' },
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'stretch',
          scrollSnapAlign: 'start',
        }}
      >
        <motion.div
          initial={prefersReducedMotion ? false : 'hidden'}
          animate="visible"
          variants={sectionReveal}
          style={{ y: heroTranslateY, opacity: heroOpacity, width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              maxWidth: { lg: 1180 },
              mx: 'auto',
              height: { xs: '100%', lg: 'min(760px, calc(100svh - 112px))' },
              maxHeight: { lg: 'min(760px, calc(100svh - 112px))' },
              borderRadius: { xs: 3, md: 4 },
              border: '1px solid rgba(12,22,44,0.08)',
              background:
                'linear-gradient(180deg, rgba(246,244,242,0.98) 0%, rgba(241,241,239,0.98) 100%)',
              boxShadow: '0 20px 44px rgba(12,22,44,0.06)',
              p: { xs: 1.2, md: 1.6 },
              minHeight: {
                xs: 'max(530px, calc(100svh - 92px))',
                sm: 'max(580px, calc(100svh - 96px))',
                md: 'max(640px, calc(100svh - 102px))',
                lg: '680px',
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                background:
                  'radial-gradient(circle at 12% 10%, rgba(0,156,59,0.04), transparent 36%), radial-gradient(circle at 88% 10%, rgba(17,17,17,0.045), transparent 40%)',
              },
              '&::after': {
                content: '""',
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: { xs: 82, md: 108 },
                pointerEvents: 'none',
                background:
                  'linear-gradient(180deg, rgba(241,241,239,0) 0%, rgba(241,241,239,0.86) 55%, rgba(241,241,239,0.97) 100%)',
              },
            }}
          >
            <Grid
              container
              spacing={{ xs: 1.4, md: 2.4, lg: 3 }}
              sx={{
                position: 'relative',
                zIndex: 1,
                minHeight: '100%',
                alignContent: 'space-between',
              }}
            >
              <Grid size={12}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  spacing={1}
                  sx={{ px: { xs: 0.45, md: 0.85 }, pt: { xs: 0.55, md: 0.9 } }}
                >
                  <Stack
                    direction="row"
                    spacing={{ xs: 0.9, md: 1.05 }}
                    alignItems="center"
                    sx={{
                      px: { xs: 0.8, md: 1 },
                      py: { xs: 0.55, md: 0.7 },
                      borderRadius: 99,
                      border: '1px solid rgba(12,22,44,0.08)',
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.52) 100%)',
                      boxShadow: '0 8px 18px rgba(12,22,44,0.035), inset 0 1px 0 rgba(255,255,255,0.6)',
                    }}
                  >
                    <Box
                      sx={{
                        width: { xs: 38, md: 42 },
                        height: { xs: 38, md: 42 },
                        borderRadius: 99,
                        bgcolor: '#111111',
                        color: '#f7f8fb',
                        display: 'grid',
                        placeItems: 'center',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.16)',
                      }}
                    >
                      <StorefrontRoundedIcon sx={{ fontSize: { xs: 20, md: 22 } }} />
                    </Box>
                    <Box sx={{ pr: { md: 0.2 } }}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: 'rgba(18, 22, 30, 0.56)',
                          letterSpacing: '0.16em',
                          lineHeight: 1.05,
                          fontSize: { xs: '0.58rem', md: '0.66rem' },
                          mb: 0.12,
                        }}
                      >
                        RODANDO MOTO CENTER
                      </Typography>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          color: '#1f252f',
                          fontWeight: 700,
                          letterSpacing: '-0.02em',
                          lineHeight: 1.05,
                          fontSize: { xs: '0.86rem', md: '0.94rem' },
                        }}
                      >
                        Catalogo e medidas tecnicas
                      </Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, lg: 7.6 }}>
                <Box sx={{ px: { xs: 0.45, md: 0.85 }, pt: { xs: 1.15, md: 1.85 }, pb: { xs: 0.2, md: 1 } }}>
                  <Typography
                    component="h1"
                    sx={{
                      m: 0,
                      color: '#121318',
                      fontWeight: 700,
                      letterSpacing: '-0.055em',
                      lineHeight: 0.9,
                      fontSize: {
                        xs: 'clamp(2.15rem, 11vw, 3.4rem)',
                        sm: 'clamp(2.7rem, 8.5vw, 4.2rem)',
                        md: 'clamp(3.7rem, 7vw, 5.25rem)',
                        lg: '5.05rem',
                      },
                      maxWidth: { xs: 640, lg: 760 },
                    }}
                  >
                    Rodando,
                    <br />
                    tudo para voce
                    <br />
                    continuar rodando.
                  </Typography>

                  <Typography
                    variant="body1"
                    sx={{
                      mt: { xs: 1.05, md: 1.35 },
                      color: 'rgba(20,24,30,0.78)',
                      maxWidth: 560,
                      lineHeight: 1.38,
                      fontSize: { xs: '0.94rem', sm: '1rem', md: '1.05rem' },
                      display: { xs: 'block', lg: 'none' },
                    }}
                  >
                    Pecas, acessorios, medidas tecnicas e atendimento comercial para manter sua moto em movimento com rapidez.
                  </Typography>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, lg: 4.4 }} sx={{ display: { xs: 'none', md: 'block' } }}>
                <Box
                  sx={{
                    px: { xs: 0.35, md: 0.7 },
                    pt: { xs: 0.1, md: 2.25 },
                    display: 'flex',
                    justifyContent: { xs: 'flex-start', lg: 'flex-end' },
                    alignItems: { lg: 'flex-end' },
                    height: '100%',
                  }}
                >
                  <Box
                    sx={{
                      width: '100%',
                      maxWidth: { xs: '100%', lg: 390 },
                      px: { xs: 0.1, md: 0.25 },
                      py: { xs: 0.05, md: 0.2 },
                    }}
                  >
                  </Box>
                </Box>
              </Grid>

              <Grid size={12}>
                <Box sx={{ px: { xs: 0.35, md: 0.55 }, pt: { xs: 0.7, md: 1.1 }, pb: { xs: 1.15, md: 1.7 } }}>
                  <Box
                    sx={{
                      position: 'relative',
                      minHeight: { xs: 230, sm: 270, md: 330, lg: 390 },
                      height: { lg: 364 },
                      borderRadius: { xs: 3, md: 4 },
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.05)',
                      background: 'linear-gradient(160deg, #181c24 0%, #11151d 45%, #0f1116 100%)',
                      boxShadow: '0 22px 38px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.04)',
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        background:
                          'radial-gradient(circle at 14% 76%, rgba(0,156,59,0.12), transparent 42%), radial-gradient(circle at 86% 22%, rgba(255,223,0,0.08), transparent 36%), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px)',
                        backgroundSize: 'auto, auto, 28px 28px, 28px 28px',
                        backgroundPosition: '0 0, 0 0, 0 0, 0 0',
                        opacity: 0.92,
                      }}
                    />

                    <Box
                      sx={{
                        position: 'absolute',
                        right: { xs: -18, sm: 14, md: 24, lg: 34 },
                        left: { xs: '38%', sm: '44%', md: '52%' },
                        top: { xs: 20, sm: 28, md: 34 },
                        bottom: { xs: 20, sm: 24, md: 28 },
                        borderRadius: { xs: 4, md: 6 },
                        background:
                          'linear-gradient(145deg, rgba(38,42,54,0.95) 0%, rgba(15,17,23,0.99) 100%)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        transform: { xs: 'rotate(-3deg)', md: 'rotate(-4deg)' },
                        boxShadow:
                          '0 28px 44px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                      }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: { xs: 10, md: 14, lg: 18 },
                          borderRadius: 4,
                          border: '1px solid rgba(255,255,255,0.04)',
                          overflow: 'hidden',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            inset: 0,
                            background:
                              'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 16px)',
                          },
                        }}
                      />
                    </Box>

                    <Box
                      sx={{
                        position: 'absolute',
                        left: { xs: 14, md: 20, lg: 28 },
                        top: { xs: 14, md: 20, lg: 28 },
                        display: 'grid',
                        gap: { xs: 0.7, md: 0.9 },
                        width: { xs: 'calc(100% - 28px)', sm: '58%', md: '46%', lg: 430 },
                        zIndex: 2,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'rgba(255,255,255,0.74)',
                          letterSpacing: '0.14em',
                        }}
                      >
                        RODANDO / HOME
                      </Typography>
                      <Typography
                        sx={{
                          color: '#f1f3f8',
                          fontSize: { xs: '1.08rem', sm: '1.2rem', md: '1.45rem', lg: '1.62rem' },
                          lineHeight: 0.98,
                          fontWeight: 700,
                          letterSpacing: '-0.04em',
                          maxWidth: { xs: 220, sm: 340, lg: 420 },
                        }}
                      >
                        Catalogo, medidas e atendimento em uma unica entrada visual.
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: 'rgba(236,239,246,0.68)',
                          maxWidth: { xs: 260, sm: 360, lg: 390 },
                          fontSize: { xs: '0.74rem', sm: '0.84rem', md: '0.9rem' },
                          lineHeight: 1.32,
                        }}
                      >
                        Titulo grande, texto curto e um bloco horizontal amplo com a seta centralizada para conduzir o scroll.
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        position: 'absolute',
                        left: '50%',
                        bottom: { xs: 18, md: 26 },
                        transform: 'translateX(-50%)',
                        zIndex: 7,
                        pointerEvents: 'none',
                      }}
                    >
                      <Button
                        type="button"
                        onClick={scrollToFeatured}
                        className="scroll-cue-pill"
                        aria-label="Descer para a seção do meio"
                        sx={{
                          position: 'relative',
                          pointerEvents: 'auto',
                          minWidth: { xs: 90, md: 104 },
                          width: { xs: 90, md: 104 },
                          height: { xs: 46, md: 52 },
                          borderRadius: 999,
                          bgcolor: 'rgba(7,10,14,0.94)',
                          color: '#ffde69',
                          border: '1px solid rgba(255,223,0,0.42)',
                          boxShadow:
                            '0 14px 30px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.05) inset, 0 0 18px rgba(255,223,0,0.14)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            inset: -7,
                            borderRadius: 999,
                            border: '1px solid rgba(255,223,0,0.12)',
                          },
                          '&::after': {
                            content: '""',
                            position: 'absolute',
                            inset: -12,
                            borderRadius: 999,
                            border: '1px solid rgba(255,223,0,0.2)',
                            opacity: 0.8,
                            animation: 'scrollCuePulseRing 1.9s ease-out infinite',
                          },
                          '&:hover': {
                            bgcolor: 'rgba(5,8,11,0.98)',
                            borderColor: 'rgba(255,223,0,0.62)',
                          },
                        }}
                      >
                        <KeyboardArrowDownRoundedIcon className="scroll-cue-icon" sx={{ fontSize: { xs: 24, md: 28 } }} />
                      </Button>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </motion.div>
      </Box>

      <Box component="section" id="home-middle" sx={{ mb: { xs: 4.5, md: 6.5 }, scrollMarginTop: { xs: 68, md: 76 } }}>
        <Stack spacing={{ xs: 2, md: 2.6 }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.4, md: 1.7 },
              borderRadius: 3,
              border: '1px solid rgba(12,22,44,0.07)',
              background:
                'radial-gradient(circle at 12% 10%, rgba(0,156,59,0.06), transparent 40%), radial-gradient(circle at 88% 12%, rgba(17,17,17,0.06), transparent 44%), linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(252,253,255,0.82) 100%)',
              boxShadow: '0 16px 34px rgba(12,22,44,0.04)',
            }}
          >
            <Stack spacing={1.3}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                justifyContent="space-between"
                alignItems={{ sm: 'flex-end' }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: 'primary.main', letterSpacing: '0.13em' }}>
                    ACESSO RAPIDO
                  </Typography>
                  <Typography variant="h5" sx={{ color: 'info.main', letterSpacing: '-0.03em' }}>
                    Navegue por area
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Entradas principais para compra, consulta tecnica e area do lojista.
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label="Atualizado para mobile"
                  sx={{
                    alignSelf: { xs: 'flex-start', sm: 'auto' },
                    fontWeight: 700,
                    bgcolor: 'rgba(255,255,255,0.86)',
                    border: '1px solid rgba(12,22,44,0.07)',
                  }}
                />
              </Stack>

              <Divider sx={{ borderColor: 'rgba(17,17,17,0.08)' }} />

              <Grid container spacing={2}>
                {quickLinks.map((link, index) => (
                  <Grid size={{ xs: 6, sm: 3 }} key={link.title}>
                    <QuickActionCard link={link} index={index} prefersReducedMotion={Boolean(prefersReducedMotion)} />
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </Paper>

          
        </Stack>
      </Box>

      <Box component="section" id="home-bottom">
      <Paper
        id="home-contact"
        elevation={0}
        sx={{
          mb: { xs: 6, md: 8 },
          p: { xs: 2.15, md: 2.8 },
          borderRadius: 3,
          border: '1px solid rgba(12,22,44,0.07)',
          background:
            'radial-gradient(circle at 8% 14%, rgba(0,156,59,0.05), transparent 42%), radial-gradient(circle at 90% 10%, rgba(17,17,17,0.05), transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(247,250,248,0.93) 100%)',
          boxShadow: '0 18px 38px rgba(12,22,44,0.045)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: 4,
            background: 'linear-gradient(90deg, rgba(0,156,59,0.9), rgba(255,223,0,0.9), rgba(17,17,17,0.86))',
            opacity: 0.85,
          },
        }}
      >
        <Grid container spacing={{ xs: 2.2, md: 2.8 }}>
          <Grid size={{ xs: 12, lg: 7.5 }}>
            <Stack spacing={1.25}>
              <Typography variant="caption" sx={{ color: 'primary.main', letterSpacing: '0.14em' }}>
                CONTATO DIGITAL
              </Typography>
              <Typography
                variant="h3"
                sx={{ color: 'info.main', letterSpacing: '-0.03em', fontSize: { xs: '1.8rem', md: '2.15rem' } }}
              >
                Como podemos ajudar?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
                Canais de atendimento e contatos comerciais organizados para resposta rapida.
              </Typography>

              <Divider sx={{ borderColor: 'rgba(17,17,17,0.08)' }} />

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <Button component="a" href={officialLinks.instagram} target="_blank" rel="noreferrer" variant="outlined" color="primary" startIcon={<InstagramIcon />}>
                  Instagram
                </Button>
                <Button component="a" href={officialLinks.facebook} target="_blank" rel="noreferrer" variant="outlined" color="primary" startIcon={<FacebookRoundedIcon />}>
                  Facebook
                </Button>
                <Button component="a" href={officialLinks.maps} target="_blank" rel="noreferrer" variant="text" color="primary">
                  Google Maps
                </Button>
              </Stack>

              <Grid container spacing={2}>
                {departments.map((department) => (
                  <Grid key={department.title} size={{ xs: 12, md: 6 }}>
                    <DepartmentCard {...department} />
                  </Grid>
                ))}
              </Grid>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, lg: 4.5 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2.5,
                border: '1px solid rgba(12,22,44,0.07)',
                bgcolor: 'rgba(255,255,255,0.86)',
                height: '100%',
                boxShadow: '0 14px 24px rgba(12,22,44,0.05)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background:
                    'radial-gradient(circle at 86% 12%, rgba(17,17,17,0.05), transparent 40%), radial-gradient(circle at 16% 82%, rgba(0,156,59,0.05), transparent 45%)',
                },
              }}
            >
              <Typography variant="caption" sx={{ color: 'primary.main', letterSpacing: '0.14em', position: 'relative', zIndex: 1 }}>
                LOJA FISICA
              </Typography>
              <Typography variant="h5" sx={{ color: 'info.main', letterSpacing: '-0.03em', mt: 0.5, position: 'relative', zIndex: 1 }}>
                Rodando Moto Center
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.4, position: 'relative', zIndex: 1 }}>
                Cascavel / PR
              </Typography>

              <Box
                sx={{
                  height: 164,
                  borderRadius: 2,
                  border: '1px solid rgba(12,22,44,0.07)',
                  bgcolor: 'rgba(247,250,248,0.96)',
                  display: 'grid',
                  placeItems: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  mb: 1.4,
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'radial-gradient(circle at 30% 75%, rgba(0,156,59,0.1), transparent 45%), radial-gradient(circle at 75% 20%, rgba(17,17,17,0.08), transparent 40%)',
                  }}
                />
                <PlaceRoundedIcon sx={{ fontSize: 46, color: 'rgba(17,17,17,0.5)', zIndex: 1 }} />
              </Box>

              <Typography variant="caption" color="text.secondary">
                Endereço
              </Typography>
              <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 600, mt: 0.4, mb: 1.3 }}>
                {storeAddress}
              </Typography>

              <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
                <Chip size="small" label="Atendimento local" variant="outlined" />
                <Chip size="small" label="Retirada e suporte" variant="outlined" />
              </Stack>

              <Stack spacing={1}>
                <Button
                  component="a"
                  href={officialLinks.maps}
                  target="_blank"
                  rel="noreferrer"
                  variant="contained"
                  color="primary"
                  startIcon={<PlaceRoundedIcon />}
                  sx={{ justifyContent: 'space-between', minHeight: 42 }}
                >
                  Abrir no Google Maps
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<ContentCopyRoundedIcon />}
                  onClick={() => void handleCopyAddress()}
                  sx={{ minHeight: 42 }}
                >
                  {copiedAddress ? 'Endereco copiado' : 'Copiar endereco'}
                </Button>
              </Stack>

              <Divider sx={{ my: 1.4, borderColor: 'rgba(12,22,44,0.07)' }} />

              <Typography
                component="a"
                href={officialLinks.maps}
                target="_blank"
                rel="noreferrer"
                variant="caption"
                className="link-underline"
                sx={{ color: 'primary.main', display: 'inline-flex', alignItems: 'center', gap: 0.4 }}
              >
                Ver rota e detalhes <LaunchRoundedIcon sx={{ fontSize: 14 }} />
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
      </Box>
    </PublicLayout>
  )
}
