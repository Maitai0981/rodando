import { useState } from 'react'
import { Box, Button, Chip, Divider, Grid, Paper, Stack, Typography } from '@mui/material'
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import FacebookRoundedIcon from '@mui/icons-material/FacebookRounded'
import InstagramIcon from '@mui/icons-material/Instagram'
import LaunchRoundedIcon from '@mui/icons-material/LaunchRounded'
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined'
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { Link as RouterLink } from 'react-router-dom'
import HeroPaper from '../components/common/HeroPaper'
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
    tint: 'rgba(0,39,118,0.04)',
  },
]

// const quickLinks = [
//   { title: 'Catalogo', note: 'Produtos', href: '/catalog' },
//   { title: 'Medidas', note: 'Tabela tecnica', href: '/technical' },
//   { title: 'Painel', note: 'Area do lojista', href: '/owner' },
// ]

const storeAddress = 'Av. Brasil, 8708 - Cascavel - PR'
const sectionReveal = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: 'easeOut' },
  },
} as const

const staggerGroup = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
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
              borderColor: 'rgba(0,39,118,0.14)',
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

export default function HomePage() {
  const prefersReducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const [copiedAddress, setCopiedAddress] = useState(false)
  const heroTranslateY = useTransform(scrollY, [0, 260], [0, prefersReducedMotion ? 0 : -28])
  const heroOpacity = useTransform(scrollY, [0, 260], [1, prefersReducedMotion ? 1 : 0.9])
  const mascotTranslateY = useTransform(scrollY, [0, 320], [0, prefersReducedMotion ? 0 : 34])
  const mascotRotate = useTransform(scrollY, [0, 320], [0, prefersReducedMotion ? 0 : 2.2])

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
    document.getElementById('home-contact')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <PublicLayout>
      <Grid
        container
        spacing={{ xs: 1.5, md: 2.2, lg: 2.6 }}
        sx={{
          mb: { xs: 4.2, md: 5.2 },
          position: 'relative',
          pb: { xs: 1.2, md: 1.55 },
          mt: { xs: -0.45, md: -1 },
          minHeight: { lg: 'calc(100svh - 148px)' },
          alignItems: { lg: 'center' },
          '& > .MuiGrid-root': {
            position: 'relative',
            zIndex: 1,
          },
        }}
      >
        <Grid size={{ xs: 12, lg: 6.5 }} sx={{ order: { xs: 1, lg: 2 } }}>
          <motion.div
            initial={prefersReducedMotion ? false : 'hidden'}
            animate="visible"
            variants={sectionReveal}
            style={{ y: heroTranslateY, opacity: heroOpacity }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.5, md: 1.85 },
                borderRadius: 2.5,
                border: '1px solid rgba(12,22,44,0.07)',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.84) 100%)',
                boxShadow: '0 8px 24px rgba(12,22,44,0.03)',
                minHeight: { lg: 'clamp(330px, 43svh, 410px)' },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              
              <Stack
                component={motion.div}
                variants={staggerGroup}
                initial={prefersReducedMotion ? false : 'hidden'}
                animate="visible"
                spacing={{ xs: 1.2, md: 1.35 }}
              >
              <Box component={motion.div} variants={revealItem}>
                <HeroPaper />
              </Box>

              <Stack component={motion.div} variants={revealItem} spacing={0.8}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.9} alignItems={{ sm: 'center' }}>
                  <Button
                    component={RouterLink}
                    to="/catalog"
                    variant="contained"
                    color="primary"
                    size="large"
                    sx={{
                      minHeight: 42,
                      px: 1.55,
                      borderRadius: 2,
                      transition: 'transform 140ms ease, box-shadow 140ms ease',
                      '&:hover': {
                        transform: 'translateY(-1px)',
                        boxShadow: '0 10px 20px rgba(0,39,118,0.14)',
                      },
                    }}
                  >
                    Ver catalogo
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/technical"
                    variant="outlined"
                    color="primary"
                    size="large"
                    sx={{
                      minHeight: 42,
                      px: 1.55,
                      borderRadius: 2,
                      borderColor: 'rgba(0,39,118,0.14)',
                      bgcolor: 'rgba(255,255,255,0.6)',
                      '&:hover': {
                        borderColor: 'rgba(0,39,118,0.24)',
                        bgcolor: 'rgba(255,255,255,0.9)',
                      },
                    }}
                  >
                    Ver medidas
                  </Button>
                </Stack>
                <Typography
                  component={RouterLink}
                  to="/owner"
                  variant="caption"
                  className="link-underline"
                  sx={{ color: 'text.secondary', display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 500 }}
                >
                  Area do lojista <ArrowOutwardRoundedIcon sx={{ fontSize: 14 }} />
                </Typography>
              </Stack>
              </Stack>
            </Paper>
          </motion.div>
        </Grid>

        <Grid size={{ xs: 12, lg: 5.5 }} sx={{ order: { xs: 2, lg: 1 } }}>
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: 18 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut', delay: 0.08 }}
            style={{ y: mascotTranslateY }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 0.4, md: 0.65 },
                borderRadius: 2.5,
                border: '1px solid transparent',
                background: 'transparent',
                backdropFilter: 'none',
                bgcolor: 'transparent',
                boxShadow: 'none',
                outline: 'none',
                minHeight: { lg: 'clamp(330px, 43svh, 410px)' },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  minHeight: { xs: 170, sm: 210, md: 255, lg: 300 },
                  width: '100%',
                  position: 'relative',
                  display: 'grid',
                  placeItems: 'center',
                  px: { xs: 0.25, md: 0.8 },
                }}
              >
                <motion.div style={{ rotate: mascotRotate }}>
                  <motion.div
                    animate={
                      prefersReducedMotion
                        ? undefined
                        : {
                            y: [0, -10, 0, 3, 0],
                            scale: [1, 1.012, 1, 0.997, 1],
                          }
                    }
                    transition={{ duration: 6.4, repeat: Infinity, ease: 'easeInOut' }}
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.03, y: -2 }}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        borderRadius: 3,
                        px: { xs: 0.8, md: 1.4 },
                        py: { xs: 0.6, md: 0.8 },
                        overflow: 'hidden',
                      }}
                    >
                      <motion.div
                        aria-hidden
                        animate={
                          prefersReducedMotion
                            ? undefined
                            : {
                                opacity: [0.7, 1, 0.78, 0.92, 0.7],
                                scale: [1, 1.035, 1.01, 1.025, 1],
                              }
                        }
                        transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 24,
                          background:
                            'radial-gradient(circle at 28% 70%, rgba(0,156,59,0.08), transparent 48%), radial-gradient(circle at 74% 24%, rgba(0,39,118,0.07), transparent 44%), radial-gradient(circle at 54% 18%, rgba(255,223,0,0.07), transparent 42%)',
                        }}
                      />
                      <motion.div
                        animate={
                          prefersReducedMotion
                            ? undefined
                            : {
                                y: [0, -2, 0, 1, 0],
                                rotate: [0, -0.6, 0, 0.45, 0],
                              }
                        }
                        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ position: 'relative', zIndex: 1 }}
                      >
                        <Box
                          component="img"
                          src="/brand/rodando-mascote.png"
                          alt="Mascote Rodando"
                          sx={{
                            width: { xs: '50%', sm: '52%', md: '58%', lg: '62%' },
                            maxWidth: 250,
                            objectFit: 'contain',
                            display: 'block',
                            mx: 'auto',
                            filter: 'drop-shadow(0 14px 28px rgba(12,22,44,0.1))',
                          }}
                        />
                      </motion.div>
                    </Box>
                  </motion.div>
                </motion.div>
              </Box>

            </Paper>
          </motion.div>
        </Grid>

        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: { xs: -2, md: 0 },
            zIndex: 3,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Button
            type="button"
            onClick={scrollToFeatured}
            className="scroll-cue-pill"
            aria-label="Descer"
            sx={{
              pointerEvents: 'auto',
              minWidth: 60,
              width: 60,
              height: 32,
              borderRadius: 999,
              bgcolor: 'rgba(12,22,44,0.86)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 6px 14px rgba(12,22,44,0.12)',
              '&:hover': { bgcolor: 'rgba(12,22,44,0.93)' },
            }}
          >
            <KeyboardArrowDownRoundedIcon className="scroll-cue-icon" sx={{ fontSize: 20 }} />
          </Button>
        </Box>
      </Grid>

      <Paper
        id="home-contact"
        elevation={0}
        sx={{
          mb: { xs: 6, md: 8 },
          p: { xs: 2.15, md: 2.8 },
          borderRadius: 3,
          border: '1px solid rgba(12,22,44,0.07)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(247,250,248,0.93) 100%)',
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
              }}
            >
              <Typography variant="caption" sx={{ color: 'primary.main', letterSpacing: '0.14em' }}>
                LOJA FISICA
              </Typography>
              <Typography variant="h5" sx={{ color: 'info.main', letterSpacing: '-0.03em', mt: 0.5 }}>
                Rodando Moto Center
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.4 }}>
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
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'radial-gradient(circle at 30% 75%, rgba(0,156,59,0.1), transparent 45%), radial-gradient(circle at 75% 20%, rgba(0,39,118,0.08), transparent 40%)',
                  }}
                />
                <PlaceRoundedIcon sx={{ fontSize: 46, color: 'rgba(0,39,118,0.5)', zIndex: 1 }} />
              </Box>

              <Typography variant="caption" color="text.secondary">
                Endereço
              </Typography>
              <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 600, mt: 0.4, mb: 1.3 }}>
                {storeAddress}
              </Typography>

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
    </PublicLayout>
  )
}
