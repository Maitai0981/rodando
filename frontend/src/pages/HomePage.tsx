import { Box, Button, Chip, Divider, Grid, Paper, Stack, Typography } from '@mui/material'
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded'
import { Link as RouterLink } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout'

const pillars = [
  {
    number: '01',
    title: 'Curadoria tecnica',
    desc: 'Tabela de medidas e aplicacoes organizadas para reduzir erro na escolha da peca.'
  },
  {
    number: '02',
    title: 'Experiencia comercial',
    desc: 'Interface clara para catalogo, preco e compra com leitura rapida em desktop e mobile.'
  },
  {
    number: '03',
    title: 'Marca com presenca',
    desc: 'Visual mais autoral e profissional, transmitindo confianca sem parecer layout generico.'
  }
]

const categories = [
  { label: 'Camaras de ar', note: 'Linha principal', accent: 'primary.main', href: '/catalog', cta: 'Ver secao' },
  { label: 'Aplicacoes por aro', note: 'Consulta tecnica', accent: 'secondary.main', href: '/technical', cta: 'Abrir medidas' },
  { label: 'Atendimento B2B', note: 'Equipe e lojistas', accent: 'info.main', href: '/catalog', cta: 'Ver secao' }
]

export default function HomePage() {
  return (
    <PublicLayout>
      <Grid container spacing={{ xs: 4, md: 5, lg: 6 }} alignItems="stretch" sx={{ mb: { xs: 8, md: 10 } }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={3.5} sx={{ height: '100%' }}>
            <Chip
              label="Especialistas em duas rodas - catalogo + medidas"
              className="reveal-up"
              sx={{
                width: 'fit-content',
                bgcolor: 'rgba(255,255,255,0.78)',
                color: 'primary.main',
                fontWeight: 600,
                borderColor: 'rgba(0,39,118,0.16)'
              }}
            />

            <Typography
              variant="h1"
              color="info.main"
              className="reveal-up"
              sx={{ animationDelay: '80ms', textTransform: 'uppercase', maxWidth: 780 }}
            >
              Faca sua loja parecer
              <Box component="span" sx={{ color: 'primary.main', display: 'block' }}>
                tecnica e premium.
              </Box>
            </Typography>

            <Typography
              variant="body1"
              color="text.secondary"
              className="reveal-up"
              sx={{ maxWidth: 580, animationDelay: '160ms' }}
            >
              A Rodando conecta catalogo comercial e informacao tecnica com uma estetica mais editorial: leitura rapida,
              hierarquia forte e sensacao de marca consolidada.
            </Typography>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ sm: 'center' }}
              className="reveal-up"
              sx={{ animationDelay: '240ms' }}
            >
              <Button component={RouterLink} to="/catalog" variant="contained" color="primary" size="large">
                Ir para o catalogo
              </Button>
              <Button component={RouterLink} to="/technical" variant="outlined" color="primary" size="large">
                Ver medidas tecnicas
              </Button>
              <Typography
                component={RouterLink}
                to="/owner"
                variant="body2"
                className="link-underline"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: 'info.main',
                  fontWeight: 500,
                  mt: { xs: 0.5, sm: 0 }
                }}
              >
                Area do lojista <ArrowOutwardRoundedIcon sx={{ fontSize: 17 }} />
              </Typography>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 2, sm: 4 }}
              className="reveal-up"
              sx={{ pt: 1, animationDelay: '320ms' }}
            >
              {[
                ['+250', 'aplicacoes catalogadas'],
                ['24h', 'prazo de resposta comercial'],
                ['B2B', 'foco em revenda e oficina']
              ].map(([value, label]) => (
                <Box key={label}>
                  <Typography variant="h4" sx={{ color: 'info.main', fontWeight: 700 }}>
                    {value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.06em' }}>
                    {label}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper
            className="reveal-up"
            elevation={0}
            sx={{
              animationDelay: '180ms',
              height: '100%',
              p: { xs: 2.25, md: 2.8 },
              borderRadius: 4,
              position: 'relative',
              overflow: 'hidden',
              background:
                'linear-gradient(160deg, rgba(255,255,255,0.95) 0%, rgba(245,251,247,0.9) 55%, rgba(237,249,241,0.96) 100%)'
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                top: -70,
                right: -60,
                width: 220,
                height: 220,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0,39,118,0.16), rgba(0,39,118,0))'
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                bottom: 40,
                left: -40,
                width: 160,
                height: 160,
                borderRadius: '50%',
                border: '1px dashed rgba(0,156,59,0.24)'
              }}
            />

            <Stack spacing={2.5} sx={{ position: 'relative', zIndex: 1 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
                spacing={1}
                sx={{ width: '100%' }}
              >
                <Typography variant="subtitle2" color="primary" sx={{ flexShrink: 0 }}>
                  Visual direction
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    minWidth: 0,
                    maxWidth: { sm: 220, md: 250 },
                    ml: { sm: 'auto' },
                    textAlign: { xs: 'left', sm: 'right' },
                    lineHeight: 1.35,
                    whiteSpace: 'normal'
                  }}
                >
                  inspirado em portfolio editorial
                </Typography>
              </Stack>

              <Box
                sx={{
                  position: 'relative',
                  borderRadius: 3,
                  border: '1px solid rgba(32,36,53,0.1)',
                  bgcolor: 'rgba(255,255,255,0.38)',
                  minHeight: 330,
                  display: 'grid',
                  placeItems: 'center',
                  overflow: 'hidden'
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'radial-gradient(circle at 30% 30%, rgba(0,39,118,0.12), transparent 50%), radial-gradient(circle at 70% 60%, rgba(0,156,59,0.1), transparent 46%), radial-gradient(circle at 55% 15%, rgba(255,223,0,0.08), transparent 42%)'
                  }}
                />
                <Box
                  className="float-animation"
                  component="img"
                  src="/brand/rodando-mascot.svg"
                  alt="Mascote Rodando"
                  sx={{
                    maxWidth: 330,
                    width: '88%',
                    zIndex: 2,
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 24px 38px rgba(32,36,53,0.16))'
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    px: 1.2,
                    py: 0.6,
                    borderRadius: 99,
                    border: '1px solid rgba(32,36,53,0.1)',
                    bgcolor: 'rgba(255,255,255,0.8)'
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600 }}>
                    apresentacao premium
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={1.1}>
                {[
                  ['Catalogo', 'Busca direta, cards com hierarquia e CTA objetivo'],
                  ['Medidas', 'Consulta rapida para evitar erro de aplicacao'],
                  ['Marca', 'Linguagem visual consistente em todo o funil']
                ].map(([title, text]) => (
                  <Stack
                    key={title}
                    direction="row"
                    spacing={1.25}
                    alignItems="flex-start"
                    sx={{ py: 1.1, borderBottom: '1px solid rgba(32,36,53,0.08)' }}
                  >
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main', mt: 0.75, flexShrink: 0 }} />
                    <Box>
                      <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 600 }}>
                        {title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {text}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ mb: { xs: 8, md: 10 }, borderRadius: 4, overflow: 'hidden' }}>
        <Stack direction={{ xs: 'column', lg: 'row' }} divider={<Divider flexItem sx={{ borderColor: 'rgba(32,36,53,0.08)' }} />}>
          <Box sx={{ p: { xs: 3, md: 4 }, width: { lg: '35%' }, bgcolor: 'rgba(0,39,118,0.04)' }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Estrutura da experiencia
            </Typography>
            <Typography variant="h3" sx={{ mb: 2 }}>
              O que deixa o site mais profissional.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Hierarquia tipografica forte, espacamento disciplinado, contraste controlado e componentes com acabamento
              consistente.
            </Typography>
          </Box>

          <Stack sx={{ flex: 1 }}>
            {pillars.map((item, index) => (
              <Box
                key={item.title}
                sx={{
                  px: { xs: 3, md: 4 },
                  py: { xs: 2.5, md: 3 },
                  borderBottom: index === pillars.length - 1 ? 'none' : '1px solid rgba(32,36,53,0.08)'
                }}
              >
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ minWidth: 70, color: 'primary.main', fontSize: '0.8rem', letterSpacing: '0.18em' }}
                  >
                    {item.number}
                  </Typography>
                  <Typography variant="h6" sx={{ minWidth: { md: 220 }, color: 'info.main' }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.desc}
                  </Typography>
                </Stack>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={3} sx={{ mb: { xs: 8, md: 10 } }}>
        {categories.map((item, index) => (
          <Grid size={{ xs: 12, md: 4 }} key={item.label}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, md: 3.5 },
                borderRadius: 3,
                height: '100%',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: 3,
                  bgcolor: item.accent
                }}
              />
              <Typography variant="subtitle2" sx={{ color: item.accent, mb: 1.5 }}>
                {String(index + 1).padStart(2, '0')} - {item.note}
              </Typography>
              <Typography variant="h4" sx={{ color: 'info.main', mb: 2 }}>
                {item.label}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Layout com leitura escaneavel, foco na informacao certa e acabamento visual mais maduro para aumentar
                percepcao de valor.
              </Typography>
              <Typography component={RouterLink} to={item.href} variant="body2" className="link-underline" sx={{ color: 'primary.main', fontWeight: 500 }}>
                {item.cta}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 3.5, md: 5 },
          borderRadius: 4,
          background:
            'linear-gradient(145deg, rgba(255,255,255,0.96) 0%, rgba(246,252,248,0.92) 55%, rgba(238,250,242,0.98) 100%)'
        }}
      >
        <Grid container spacing={4} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Proximo passo
            </Typography>
            <Typography variant="h3" gutterBottom>
              Performance e seguranca com uma presenca digital a altura da sua operacao.
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 680 }}>
              Se quiser, eu tambem posso aplicar essa mesma linguagem visual nas paginas de catalogo e medidas tecnicas
              para deixar todo o fluxo com a mesma identidade.
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={1.25}>
              <Button fullWidth size="large" variant="contained" color="primary" component={RouterLink} to="/catalog">
                Falar com especialista
              </Button>
              <Button fullWidth size="large" variant="outlined" color="primary" component={RouterLink} to="/technical">
                Revisar medidas
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </PublicLayout>
  )
}
