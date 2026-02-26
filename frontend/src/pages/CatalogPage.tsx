import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Chip, Grid, MenuItem, Paper, Select, Stack, TextField, Typography, FormControl, InputLabel } from '@mui/material'
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded'
import ArrowForwardIosRoundedIcon from '@mui/icons-material/ArrowForwardIosRounded'
import SortRoundedIcon from '@mui/icons-material/SortRounded'
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import PublicLayout from '../layouts/PublicLayout'
import { api, ApiError, type Product } from '../lib/api'
import { useCart } from '../context/CartContext'
function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type SortOption = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'newest'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' } },
} as const

const listStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
} as const

const featuredSlideVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 28 : -28,
    scale: 0.985,
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.38 },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -24 : 24,
    scale: 0.99,
    transition: { duration: 0.26 },
  }),
} as const

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [featuredDirection, setFeaturedDirection] = useState<1 | -1>(1)
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('name-asc')
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas')
  const deferredQuery = useDeferredValue(query)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { addProduct } = useCart()
  const prefersReducedMotion = useReducedMotion()
  const featuredProducts = products.slice(0, 8)
  const activeFeatured = featuredProducts[featuredIndex] ?? null

  // Extract unique categories from products
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean))
    return ['Todas', ...Array.from(cats).sort()]
  }, [products])

  // Sort and filter products
  const sortedProducts = useMemo(() => {
    let filtered = products
    
    // Apply category filter
    if (categoryFilter !== 'Todas') {
      filtered = filtered.filter(p => p.category === categoryFilter)
    }
    
    // Apply sorting
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name, 'pt-BR')
        case 'name-desc':
          return b.name.localeCompare(a.name, 'pt-BR')
        case 'price-asc':
          return Number(a.price) - Number(b.price)
        case 'price-desc':
          return Number(b.price) - Number(a.price)
        case 'newest':
          return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)
        default:
          return 0
      }
    })
  }, [products, sortBy, categoryFilter])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProducts(deferredQuery)
    }, 220)

    return () => window.clearTimeout(timeoutId)
  }, [deferredQuery])

  useEffect(() => {
    if (featuredProducts.length === 0) {
      setFeaturedIndex(0)
      return
    }
    if (featuredIndex > featuredProducts.length - 1) {
      setFeaturedIndex(0)
    }
  }, [featuredIndex, featuredProducts.length])

  useEffect(() => {
    if (featuredProducts.length <= 1) return

    const intervalId = window.setInterval(() => {
      setFeaturedDirection(1)
      setFeaturedIndex((prev) => (prev + 1) % featuredProducts.length)
    }, 2000)

    return () => window.clearInterval(intervalId)
  }, [featuredProducts.length])

  async function loadProducts(search = query) {
    setLoading(true)
    setError(null)
    try {
      const result = await api.listPublicProducts(search)
      startTransition(() => {
        setProducts(result.items)
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar catalogo.')
    } finally {
      setLoading(false)
    }
  }

  function showPrevFeatured() {
    setFeaturedDirection(-1)
    setFeaturedIndex((prev) => {
      if (featuredProducts.length === 0) return 0
      return prev === 0 ? featuredProducts.length - 1 : prev - 1
    })
  }

  function showNextFeatured() {
    setFeaturedDirection(1)
    setFeaturedIndex((prev) => {
      if (featuredProducts.length === 0) return 0
      return (prev + 1) % featuredProducts.length
    })
  }

  function clearFilters() {
    setQuery('')
    setCategoryFilter('Todas')
    setSortBy('name-asc')
  }

  const hasActiveFilters = query !== '' || categoryFilter !== 'Todas' || sortBy !== 'name-asc'

  return (
    <PublicLayout>
      <Stack spacing={{ xs: 2.5, md: 3.5 }}>
        <Paper
          component={motion.div}
          initial={prefersReducedMotion ? false : 'hidden'}
          animate="visible"
          variants={fadeUp}
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: 3,
            border: '1px solid rgba(12,22,44,0.08)',
            background:
              'radial-gradient(circle at 10% 12%, rgba(0,156,59,0.06), transparent 44%), radial-gradient(circle at 92% 12%, rgba(17,17,17,0.06), transparent 46%), linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(252,253,255,0.9) 100%)',
            boxShadow: '0 16px 32px rgba(12,22,44,0.04)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 42%)',
            },
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, lg: 5 }}>
              <Typography variant="caption" sx={{ color: 'primary.main', letterSpacing: '0.12em' }}>
                CATALOGO
              </Typography>
              <Typography
                variant="h3"
                sx={{ color: 'info.main', letterSpacing: '-0.03em', lineHeight: 0.98, mb: 0.45 }}
              >
                Pecas para motos
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Busca rapida por nome, categoria ou fabricante.
              </Typography>
              <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mt: 1.25 }}>
                <Chip size="small" label={`${products.length} itens carregados`} variant="outlined" />
                <Chip size="small" label={`${Math.max(categories.length - 1, 0)} categorias`} variant="outlined" />
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, lg: 7 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  fullWidth
                  placeholder="Buscar por nome, categoria, fabricante..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void loadProducts(query)}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => void loadProducts(query)}
                  sx={{ minWidth: { sm: 132 }, width: { xs: '100%', sm: 'auto' } }}
                >
                  Buscar
                </Button>
              </Stack>
              
              {/* Category Filter Chips */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                sx={{ mt: 1.5 }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                  <FilterListRoundedIcon color="action" sx={{ fontSize: 18 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                    Categoria:
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  spacing={0.6}
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
                      onClick={() => setCategoryFilter(cat)}
                      variant={categoryFilter === cat ? 'filled' : 'outlined'}
                      color={categoryFilter === cat ? 'primary' : 'default'}
                      sx={{ fontWeight: categoryFilter === cat ? 700 : 500 }}
                    />
                  ))}
                </Stack>
              </Stack>

              {/* Results Info and Sort */}
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1.5 }} flexWrap="wrap" gap={1}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip size="small" label={`${sortedProducts.length} produtos`} />
                  <AnimatePresence>
                    {query && (
                      <motion.div
                        key="search-chip"
                        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.18 }}
                      >
                        <Chip 
                          size="small" 
                          label={`Busca: "${query}"`} 
                          variant="outlined" 
                          onDelete={() => setQuery('')}
                        />
                      </motion.div>
                    )}
                    {categoryFilter !== 'Todas' && (
                      <motion.div
                        key="category-chip"
                        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.18 }}
                      >
                        <Chip 
                          size="small" 
                          label={categoryFilter} 
                          color="primary"
                          variant="filled"
                          onDelete={() => setCategoryFilter('Todas')}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {hasActiveFilters && (
                    <Button size="small" onClick={clearFilters} sx={{ ml: 0.5 }}>
                      Limpar filtros
                    </Button>
                  )}
                </Stack>
                
                <FormControl size="small" sx={{ minWidth: { sm: 150 }, width: { xs: '100%', sm: 'auto' } }}>
                  <InputLabel id="sort-label">Ordenar por</InputLabel>
                  <Select
                    labelId="sort-label"
                    value={sortBy}
                    label="Ordenar por"
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    startAdornment={<SortRoundedIcon sx={{ mr: 0.5, fontSize: 18 }} />}
                  >
                    <MenuItem value="name-asc">Nome (A-Z)</MenuItem>
                    <MenuItem value="name-desc">Nome (Z-A)</MenuItem>
                    <MenuItem value="price-asc">Menor preco</MenuItem>
                    <MenuItem value="price-desc">Maior preco</MenuItem>
                    <MenuItem value="newest">Mais recentes</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        <Paper
          component={motion.div}
          initial={prefersReducedMotion ? false : 'hidden'}
          animate="visible"
          variants={fadeUp}
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: 3,
            border: '1px solid rgba(12,22,44,0.08)',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.93) 0%, rgba(248,251,249,0.88) 100%)',
            boxShadow: '0 14px 28px rgba(12,22,44,0.035)',
          }}
        >
          <Stack spacing={2}>
            <Box aria-hidden sx={{ height: 1, borderRadius: 999, bgcolor: 'rgba(17,17,17,0.08)' }} />
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1.5} alignItems={{ sm: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'primary.main', letterSpacing: '0.14em' }}>
                  DESTAQUES DO CATALOGO
                </Typography>
                <Typography variant="h5" sx={{ color: 'info.main', letterSpacing: '-0.03em' }}>
                  Produtos em rotacao
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={showPrevFeatured}
                  disabled={loading || featuredProducts.length <= 1}
                  sx={{ minWidth: 42, px: 0 }}
                  aria-label="Produto anterior"
                >
                  <ArrowBackIosNewRoundedIcon sx={{ fontSize: 16 }} />
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={showNextFeatured}
                  disabled={loading || featuredProducts.length <= 1}
                  sx={{ minWidth: 42, px: 0 }}
                  aria-label="Proximo produto"
                >
                  <ArrowForwardIosRoundedIcon sx={{ fontSize: 16 }} />
                </Button>
              </Stack>
            </Stack>

            {loading ? (
              <Paper elevation={0} sx={{ p: 3, borderRadius: 2.5, border: '1px solid rgba(12,22,44,0.07)', bgcolor: 'rgba(255,255,255,0.82)' }}>
                <Typography variant="body2" color="text.secondary">
                  Carregando destaques...
                </Typography>
              </Paper>
            ) : error ? (
              <Paper elevation={0} sx={{ p: 3, borderRadius: 2.5, border: '1px solid rgba(12,22,44,0.07)', bgcolor: 'rgba(255,255,255,0.82)' }}>
                <Typography variant="body2" color="error.main">
                  {error}
                </Typography>
              </Paper>
            ) : featuredProducts.length === 0 ? (
              <Paper elevation={0} sx={{ p: 3, borderRadius: 2.5, border: '1px solid rgba(12,22,44,0.07)', bgcolor: 'rgba(255,255,255,0.82)' }}>
                <Typography variant="body2" color="text.secondary">
                  Nenhum produto para exibir no carrossel.
                </Typography>
              </Paper>
            ) : (
              <>
                <Box
                  sx={{
                    overflow: 'hidden',
                    borderRadius: 2.5,
                    border: '1px solid rgba(12,22,44,0.07)',
                    bgcolor: 'rgba(255,255,255,0.84)',
                  }}
                >
                  <AnimatePresence mode="wait" custom={featuredDirection}>
                    {activeFeatured ? (
                      <motion.div
                        key={activeFeatured.id}
                        custom={featuredDirection}
                        variants={featuredSlideVariants}
                        initial={prefersReducedMotion ? false : 'enter'}
                        animate="center"
                        exit={prefersReducedMotion ? undefined : 'exit'}
                      >
                        <Box sx={{ p: { xs: 1.5, md: 2 } }}>
                          <Grid container spacing={2} alignItems="stretch">
                            <Grid size={{ xs: 12, md: 6.8 }}>
                              <Stack spacing={1.2} sx={{ height: '100%' }}>
                                <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                                  <Chip size="small" label={activeFeatured.category} color="primary" variant="outlined" />
                                  <Chip
                                    size="small"
                                    label={activeFeatured.stock > 0 ? `${activeFeatured.stock} un.` : 'Sem estoque'}
                                    color={activeFeatured.stock > 0 ? 'secondary' : 'default'}
                                    variant={activeFeatured.stock > 0 ? 'filled' : 'outlined'}
                                  />
                                </Stack>
                                  <Typography variant="h4" sx={{ color: 'info.main', letterSpacing: '-0.03em', lineHeight: 1, fontSize: { xs: '1.55rem', md: '2rem' } }}>
                                    {activeFeatured.name}
                                  </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {activeFeatured.manufacturer} • {activeFeatured.bikeModel}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    minHeight: 40,
                                  }}
                                >
                                  {activeFeatured.description}
                                </Typography>
                                <Typography variant="h4" sx={{ color: 'info.main', letterSpacing: '-0.03em', mt: 'auto' }}>
                                  {formatPrice(Number(activeFeatured.price))}
                                </Typography>
                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                  <Button
                                    variant="contained"
                                    color="primary"
                                    disabled={activeFeatured.stock <= 0}
                                    onClick={() => void addProduct(activeFeatured, 1)}
                                  >
                                    {activeFeatured.stock > 0 ? 'Adicionar na mochila' : 'Sem estoque'}
                                  </Button>
                                  <Button variant="outlined" color="primary" onClick={() => setQuery(activeFeatured.name)}>
                                    Filtrar este item
                                  </Button>
                                </Stack>
                              </Stack>
                            </Grid>

                            <Grid size={{ xs: 12, md: 5.2 }}>
                              <Box
                                sx={{
                                  height: '100%',
                                  minHeight: { xs: 170, md: 220 },
                                  borderRadius: 2.25,
                                  border: '1px solid rgba(12,22,44,0.07)',
                                  bgcolor: 'rgba(247,250,248,0.96)',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  display: 'grid',
                                  placeItems: 'center',
                                }}
                              >
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    background:
                                      'radial-gradient(circle at 30% 75%, rgba(0,156,59,0.08), transparent 44%), radial-gradient(circle at 75% 20%, rgba(17,17,17,0.07), transparent 40%), radial-gradient(circle at 58% 22%, rgba(255,223,0,0.08), transparent 38%)',
                                  }}
                                />
                                {activeFeatured.imageUrl ? (
                                  <Box
                                    component="img"
                                    src={activeFeatured.imageUrl}
                                    alt={activeFeatured.name}
                                    sx={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'contain',
                                      p: 2,
                                      zIndex: 1,
                                    }}
                                  />
                                ) : (
                                  <Box
                                    sx={{
                                      width: 84,
                                      height: 84,
                                      borderRadius: '50%',
                                      border: '2px dashed rgba(17,17,17,0.18)',
                                      zIndex: 1,
                                    }}
                                  />
                                )}
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </Box>

                <Stack direction="row" spacing={0.6} justifyContent="center">
                  {featuredProducts.map((item, index) => (
                    <Box
                      key={item.id}
                      component={motion.button}
                      layout
                      whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                      type="button"
                      onClick={() => {
                        setFeaturedDirection(index >= featuredIndex ? 1 : -1)
                        setFeaturedIndex(index)
                      }}
                      aria-label={`Ir para destaque ${index + 1}`}
                      sx={{
                        width: index === featuredIndex ? 20 : 8,
                        height: 8,
                        borderRadius: 999,
                        border: 'none',
                        bgcolor: index === featuredIndex ? 'primary.main' : 'rgba(17,17,17,0.18)',
                        transition: 'all 180ms ease',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </Stack>
              </>
            )}
          </Stack>
        </Paper>

        <AnimatePresence>
          {error ? (
            <motion.div
              key="catalog-error"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <Alert severity="error">{error}</Alert>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {loading ? (
          <Paper
            component={motion.div}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 3,
              border: '1px solid rgba(12,22,44,0.08)',
              bgcolor: 'rgba(255,255,255,0.88)',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Carregando catalogo...
            </Typography>
          </Paper>
        ) : sortedProducts.length === 0 ? (
          <Paper
            component={motion.div}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            elevation={0}
            sx={{
              p: 5,
              borderRadius: 3,
              border: '1px solid rgba(12,22,44,0.08)',
              bgcolor: 'rgba(255,255,255,0.88)',
              textAlign: 'center',
            }}
          >
            <Typography variant="h6" sx={{ color: 'info.main', mb: 1 }}>
              Nenhum produto encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {hasActiveFilters 
                ? 'Ajuste os filtros ou limpe a busca para ver todos os produtos.'
                : 'Tente buscar por outro termo.'}
            </Typography>
            {hasActiveFilters && (
              <Button variant="outlined" color="primary" onClick={clearFilters}>
                Limpar todos os filtros
              </Button>
            )}
          </Paper>
        ) : (
          <Grid
            container
            spacing={2}
            component={motion.div}
            variants={listStagger}
            initial={prefersReducedMotion ? false : 'hidden'}
            animate="visible"
          >
            {sortedProducts.map((item) => (
              <Grid size={{ xs: 12, md: 6, xl: 4 }} key={item.id}>
                <motion.div
                  variants={fadeUp}
                  whileHover={prefersReducedMotion ? undefined : { y: -4 }}
                  transition={{ duration: 0.18 }}
                  style={{ height: '100%' }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      border: '1px solid rgba(12,22,44,0.08)',
                      bgcolor: 'rgba(255,255,255,0.9)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 1.25 }}>
                    <Box>
                      <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>
                        {item.category}
                      </Typography>
                      <Typography variant="h6" sx={{ color: 'info.main', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                        {item.name}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={item.stock > 0 ? `${item.stock} un.` : 'Sem estoque'}
                      color={item.stock > 0 ? 'secondary' : 'default'}
                      variant={item.stock > 0 ? 'filled' : 'outlined'}
                      sx={{ flexShrink: 0 }}
                    />
                  </Stack>

                  <Box
                    sx={{
                      mb: 1.5,
                      borderRadius: 2,
                      border: '1px solid rgba(12,22,44,0.06)',
                      bgcolor: 'rgba(248,250,248,0.95)',
                      height: 130,
                      display: 'grid',
                      placeItems: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {item.imageUrl ? (
                      <motion.div
                        whileHover={prefersReducedMotion ? undefined : { scale: 1.04 }}
                        transition={{ duration: 0.2 }}
                        style={{ width: '100%', height: '100%' }}
                      >
                        <Box
                          component="img"
                          src={item.imageUrl}
                          alt={item.name}
                          sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 1.25 }}
                        />
                      </motion.div>
                    ) : (
                      <Box sx={{ width: 48, height: 48, borderRadius: '50%', border: '1px dashed rgba(17,17,17,0.22)' }} />
                    )}
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {item.manufacturer} • {item.bikeModel}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: 34,
                      mb: 1.4,
                    }}
                  >
                    {item.description}
                  </Typography>

                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    spacing={{ xs: 1, sm: 0 }}
                    sx={{ mt: 'auto', pt: 0.75 }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ color: 'info.main', lineHeight: 1.1 }}>
                        {formatPrice(Number(item.price))}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        SKU: {item.sku}
                      </Typography>
                    </Box>
                    <Button
                      component={motion.button}
                      whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
                      variant="outlined"
                      color="primary"
                      disabled={item.stock <= 0}
                      onClick={() => void addProduct(item, 1)}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                      {item.stock > 0 ? 'Adicionar' : 'Sem estoque'}
                    </Button>
                  </Stack>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        )}
      </Stack>
    </PublicLayout>
  )
}
