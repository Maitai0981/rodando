import { useState, useMemo } from 'react'
import { Box, Chip, Grid, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded'
import { AppShell } from '../layouts/AppShell'

// Expanded tire/inner tube technical data
const technicalData = [
  // Aro 17
  { size: '250-17', category: 'Fina', applications: '250-17, 60/100-17, 225-17, 275-17' },
  { size: '275-17', category: 'Fina', applications: '275-17, 80/90-17, 90/80-17' },
  { size: '300-17', category: 'Larga', applications: '300-17, 130/70-17, 140/70-17, 120/70-17' },
  { size: '325-17', category: 'Larga', applications: '325-17, 100/80-17' },
  // Aro 18
  { size: '275-18', category: 'Fina', applications: '275-18, 90/90-18, 80/100-18, 300-18' },
  { size: '300-18', category: 'Fina', applications: '300-18, 325-18, 90/90-18' },
  { size: '325-18', category: 'Fina', applications: '325-18, 350-18' },
  { size: '350-18', category: 'Média', applications: '350-18, 100/90-18, 110/90-18' },
  { size: '400-18', category: 'Larga', applications: '400-18, 120/80-18, 130/80-18' },
  { size: '450-18', category: 'Larga', applications: '450-18, 110/90-18, 120/90-18' },
  // Aro 19
  { size: '275-19', category: 'Fina', applications: '275-19, 80/100-19, 90/90-19' },
  { size: '300-19', category: 'Fina', applications: '300-19, 325-19' },
  { size: '325-19', category: 'Média', applications: '325-19, 350-19, 100/90-19' },
  { size: '350-19', category: 'Média', applications: '350-19, 110/90-19' },
  // Aro 21
  { size: '275-21', category: 'Fina', applications: '275-21, 80/100-21, 90/90-21' },
  { size: '300-21', category: 'Fina', applications: '300-21, 325-21' },
  { size: '325-21', category: 'Larga', applications: '325-21, 80/100-21, 90/90-21' },
  { size: '350-21', category: 'Larga', applications: '350-21, 100/90-21' },
  { size: '450-21', category: 'Extra Larga', applications: '450-21, 120/70-21, 110/80-21' },
  // Aro 14
  { size: '250-14', category: 'Fina', applications: '250-14, 275-14' },
  { size: '275-14', category: 'Fina', applications: '275-14, 300-14' },
  { size: '300-14', category: 'Fina', applications: '300-14, 80/100-14' },
  { size: '325-14', category: 'Média', applications: '325-14, 350-14, 110/80-14' },
  { size: '350-14', category: 'Larga', applications: '350-14, 100/90-14, 110/90-14' },
  // Aro 16
  { size: '225-16', category: 'Fina', applications: '225-16, 250-16' },
  { size: '250-16', category: 'Fina', applications: '250-16, 275-16' },
  { size: '275-16', category: 'Fina', applications: '275-16, 300-16' },
  { size: '300-16', category: 'Média', applications: '300-16, 325-16, 90/90-16' },
  { size: '325-16', category: 'Média', applications: '325-16, 350-16' },
  { size: '350-16', category: 'Larga', applications: '350-16, 100/90-16, 110/90-16' },
  // Aro 20
  { size: '275-20', category: 'Fina', applications: '275-20, 300-20' },
  { size: '300-20', category: 'Fina', applications: '300-20, 325-20' },
  { size: '325-20', category: 'Média', applications: '325-20, 350-20' },
  { size: '350-20', category: 'Larga', applications: '350-20, 100/90-20' },
  // Aro 23
  { size: '300-23', category: 'Fina', applications: '300-23, 325-23' },
  { size: '325-23', category: 'Fina', applications: '325-23, 350-23' },
  { size: '350-23', category: 'Média', applications: '350-23, 110/80-23' },
]

const categories = ['Todas', 'Fina', 'Média', 'Larga', 'Extra Larga']

export default function TechnicalPage() {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todas')

  const filteredData = useMemo(() => {
    return technicalData.filter((item) => {
      const matchesSearch = search === '' || 
        item.size.toLowerCase().includes(search.toLowerCase()) ||
        item.applications.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = selectedCategory === 'Todas' || item.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [search, selectedCategory])

  return (
    <AppShell contained={false}>
      <Stack spacing={4}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.6 },
            borderRadius: 3,
            border: '1px solid rgba(12,22,44,0.08)',
            background:
              'radial-gradient(circle at 10% 14%, rgba(0,156,59,0.06), transparent 42%), radial-gradient(circle at 92% 18%, rgba(17,17,17,0.06), transparent 44%), linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(251,252,255,0.9) 100%)',
            boxShadow: '0 16px 32px rgba(12,22,44,0.04)',
          }}
        >
          <Stack spacing={1.4}>
            {/* Header Section */}
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={3}
              alignItems={{ md: 'center' }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: 'primary.main', letterSpacing: '0.12em' }}>
                  TABELA TECNICA
                </Typography>
                <Typography variant="h2" color="info.main" gutterBottom sx={{ lineHeight: 0.98 }}>
                  Medidas e Aplicações
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Ao selecionar uma câmara de ar ou pneumático para sua moto, utilize as medidas corretas para garantir segurança e performance.
                </Typography>
                <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mt: 1.2 }}>
                  <Chip size="small" label={`${technicalData.length} medidas mapeadas`} variant="outlined" />
                  <Chip size="small" label="Busca por aplicação" variant="outlined" />
                </Stack>
              </Box>
              <Box
                sx={{
                  width: { xs: 86, sm: 108 },
                  height: { xs: 86, sm: 108 },
                  borderRadius: '50%',
                  bgcolor: '#FFFFFF',
                  display: 'grid',
                  placeItems: 'center',
                  border: '2px solid rgba(255,223,0,0.9)',
                  boxShadow: '0 12px 22px rgba(12,22,44,0.06)',
                  flexShrink: 0,
                  alignSelf: { xs: 'center', md: 'auto' },
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    background:
                      'radial-gradient(circle at 24% 22%, rgba(0,156,59,0.08), transparent 55%), radial-gradient(circle at 78% 26%, rgba(17,17,17,0.07), transparent 58%)',
                  },
                }}
              >
                <Box component="img" src="/brand/rodando-mascote.png" alt="Mascote" sx={{ width: { xs: 46, sm: 58 }, opacity: 0.88, zIndex: 1 }} />
              </Box>
            </Stack>

            <Box aria-hidden sx={{ height: 1, borderRadius: 999, bgcolor: 'rgba(17,17,17,0.08)' }} />
          </Stack>
        </Paper>

        {/* Search and Filter Section */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.6, sm: 2, md: 2.5 },
            borderRadius: 3,
            border: '1px solid rgba(12,22,44,0.08)',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.93) 0%, rgba(248,251,249,0.88) 100%)',
            boxShadow: '0 14px 26px rgba(12,22,44,0.03)',
          }}
        >
          <Stack spacing={2}>
            <TextField
              fullWidth
              placeholder="Buscar por medida (ex: 300-17) ou aplicação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255,255,255,0.82)',
                }
              }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <FilterListRoundedIcon color="action" sx={{ fontSize: 20 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                  Filtrar por tipo:
                </Typography>
              </Stack>
              <Stack
                direction="row"
                spacing={0.8}
                flexWrap={{ xs: 'nowrap', sm: 'wrap' }}
                useFlexGap
                sx={{
                  overflowX: { xs: 'auto', sm: 'visible' },
                  pb: { xs: 0.25, sm: 0 },
                  '&::-webkit-scrollbar': { display: 'none' },
                  scrollbarWidth: 'none',
                }}
              >
                {categories.map((cat) => (
                  <Chip
                    key={cat}
                    label={cat}
                    size="small"
                    onClick={() => setSelectedCategory(cat)}
                    variant={selectedCategory === cat ? 'filled' : 'outlined'}
                    color={selectedCategory === cat ? 'primary' : 'default'}
                    sx={{
                      fontWeight: selectedCategory === cat ? 700 : 500,
                      transition: 'all 0.2s ease',
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        {/* Results Info */}
        <Box>
          <Typography variant="body2" color="text.secondary">
            Mostrando <strong>{filteredData.length}</strong> resultado{filteredData.length !== 1 ? 's' : ''}
            {search && ` para "${search}"`}
            {selectedCategory !== 'Todas' && ` na categoria "${selectedCategory}"`}
          </Typography>
        </Box>

        {/* Technical Data Grid */}
        {filteredData.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 5,
              borderRadius: 3,
              border: '1px solid rgba(12,22,44,0.08)',
              bgcolor: 'rgba(255,255,255,0.9)',
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhum resultado encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tente buscar por outra medida ou categoria.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={2.5}>
            {filteredData.map((item, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={`${item.size}-${index}`}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 2.5, 
                    borderRadius: 3, 
                    borderBottom: '3px solid #0B5F2A',
                    height: '100%',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(17,17,17,0.1)',
                    }
                  }}
                >
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" color="primary" sx={{ fontWeight: 700, letterSpacing: '0.08em' }}>
                        CÂMARA DE AR
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'info.main', fontWeight: 600, mt: 0.5, lineHeight: 1.05 }}>
                        Aro {item.size}
                      </Typography>
                      <Chip 
                        size="small" 
                        label={item.category}
                        sx={{ 
                          mt: 1,
                          bgcolor: item.category === 'Extra Larga' ? 'rgba(255,0,0,0.1)' : 
                                   item.category === 'Larga' ? 'rgba(0,156,59,0.1)' : 
                                   item.category === 'Média' ? 'rgba(255,204,0,0.15)' : 
                                   'rgba(17,17,17,0.1)',
                          color: item.category === 'Extra Larga' ? '#d32f2f' : 
                                 item.category === 'Larga' ? '#0B5F2A' : 
                                 item.category === 'Média' ? '#997000' : 
                                 '#111111',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Aplicações compatíveis:
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.5 }}>
                        {item.applications}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>
    </AppShell>
  )
}
