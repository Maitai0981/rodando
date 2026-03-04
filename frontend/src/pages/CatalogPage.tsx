import { CloseRoundedIcon, FilterListRoundedIcon, NavigateNextRoundedIcon } from '@/ui/primitives/Icon'
import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Rating,
  Select,
  Skeleton,
  Slider,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '../layouts/AppShell'
import { api, ApiError, buildProductUrl, type Product, type ProductListParams } from '../lib/api'
import { formatCurrency } from '../lib'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useAssist } from '../context/AssistContext'
import { AssistHintInline } from '../components/assist'
import { ResponsiveImage } from '../ui'

const PAGE_SIZE = 12
const PRICE_MIN = 0
const PRICE_MAX = 1200

type SortOption = NonNullable<ProductListParams['sort']>
type AvailabilityFilter = 'all' | 'in-stock' | 'out-of-stock'
type PromoFilter = 'all' | 'promo'

function buildSearchParamsPatch(
  current: URLSearchParams,
  patch: Record<string, string | number | null | undefined>,
) {
  const next = new URLSearchParams(current)
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === null || value === '') {
      next.delete(key)
      continue
    }
    next.set(key, String(value))
  }
  if (!next.get('page')) {
    next.set('page', '1')
  }
  return next
}

function ProductCard({
  item,
  onRequestReview,
  onOpenDetails,
  onPrefetchDetails,
}: {
  item: Product
  onRequestReview: (product: Product) => void
  onOpenDetails: (product: Product) => void
  onPrefetchDetails: (product: Product) => void
}) {
  const urgency = Number(item.stock || 0) <= 3 ? 'Ultimas unidades' : null

  return (
    <Paper
      className="store-surface"
      elevation={0}
      sx={{
        p: { xs: 1.6, md: 2 },
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: 'primary.main',
          boxShadow: '0 8px 24px rgba(15,23,42,0.14)',
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 1 }}>
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
            {item.category}
          </Typography>
          <Typography component="button" onClick={() => onOpenDetails(item)} variant="h6" sx={{ color: 'text.primary', lineHeight: 1.1, letterSpacing: '-0.02em', p: 0, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer' }}>
            {item.name}
          </Typography>
        </Box>
        <Chip size="small" label={`${item.stock} un.`} variant={Number(item.stock) > 0 ? 'filled' : 'outlined'} color={Number(item.stock) > 0 ? 'success' : 'default'} />
      </Stack>

      <Box
        onClick={() => onOpenDetails(item)}
        onMouseEnter={() => onPrefetchDetails(item)}
        onFocus={() => onPrefetchDetails(item)}
        sx={{
          mb: 1.4,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'grey.100',
          height: { xs: 160, md: 180 },
          overflow: 'hidden',
          position: 'relative',
          cursor: 'pointer',
        }}
      >
        <ResponsiveImage
          src={item.imageUrl}
          alt={item.name}
          sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
          sx={{
            transition: 'transform 250ms ease, opacity 220ms ease',
            '.MuiPaper-root:hover &': {
              transform: item.hoverImageUrl ? 'scale(1.03)' : 'scale(1.05)',
              opacity: item.hoverImageUrl ? 0 : 1,
            },
          }}
        />
        {item.hoverImageUrl ? (
          <ResponsiveImage
            src={item.hoverImageUrl}
            alt={`${item.name} detalhe`}
            sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              transition: 'opacity 220ms ease',
              '.MuiPaper-root:hover &': {
                opacity: 1,
              },
            }}
          />
        ) : null}
      </Box>

      <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mb: 0.8 }}>
        {item.discountPercent ? <Chip size="small" label={`${item.discountPercent}% OFF`} color="warning" /> : null}
        {urgency ? <Chip size="small" label={urgency} color="error" variant="outlined" /> : null}
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.8 }}>
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
          mb: 1.2,
        }}
      >
        {item.description}
      </Typography>

      <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 'auto' }}>
        <Typography variant="h5" sx={{ color: 'info.main', fontWeight: 700 }}>
          {formatCurrency(Number(item.price))}
        </Typography>
        {item.compareAtPrice && Number(item.compareAtPrice) > Number(item.price) ? (
          <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
            {formatCurrency(Number(item.compareAtPrice))}
          </Typography>
        ) : null}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
        SKU: {item.sku}
      </Typography>
      <Stack direction="row" spacing={0.8}>
        <AddToCartButton product={item} />
        <Button
          variant="outlined"
          color="primary"
          onMouseEnter={() => onPrefetchDetails(item)}
          onFocus={() => onPrefetchDetails(item)}
          onClick={() => onOpenDetails(item)}
        >
          Ver detalhes
        </Button>
        <Button variant="outlined" color="primary" onClick={() => onRequestReview(item)}>
          Avaliar
        </Button>
      </Stack>
    </Paper>
  )
}

function AddToCartButton({ product }: { product: Product }) {
  const { addProduct } = useCart()
  const { completeStep } = useAssist()
  return (
    <Button
      data-testid={`catalog-add-${product.id}`}
      variant="contained"
      color="primary"
      disabled={Number(product.stock) <= 0}
      onClick={() => {
        completeStep('add-to-bag', 'catalog')
        void addProduct(product, 1)
      }}
      sx={{ flex: 1 }}
    >
      {Number(product.stock) > 0 ? 'Adicionar' : 'Sem estoque'}
    </Button>
  )
}

function FiltersPanel(props: {
  search: string
  onSearchChange: (value: string) => void
  category: string
  onCategoryChange: (value: string) => void
  categories: string[]
  manufacturer: string
  onManufacturerChange: (value: string) => void
  manufacturers: string[]
  availability: AvailabilityFilter
  onAvailabilityChange: (value: AvailabilityFilter) => void
  promo: PromoFilter
  onPromoChange: (value: PromoFilter) => void
  sort: SortOption
  onSortChange: (value: SortOption) => void
  priceRange: [number, number]
  onPriceRangeChange: (value: [number, number]) => void
  onApply: () => void
  onClear: () => void
}) {
  const {
    search,
    onSearchChange,
    category,
    onCategoryChange,
    categories,
    manufacturer,
    onManufacturerChange,
    manufacturers,
    availability,
    onAvailabilityChange,
    promo,
    onPromoChange,
    sort,
    onSortChange,
    priceRange,
    onPriceRangeChange,
    onApply,
    onClear,
  } = props

  return (
    <Stack spacing={2}>
      <TextField
        inputProps={{ 'data-testid': 'catalog-search-input' }}
        label="Buscar produto"
        placeholder="Nome, SKU, fabricante..."
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onApply()
        }}
      />
      <FormControl fullWidth size="small">
        <InputLabel id="catalog-category-label">Categoria</InputLabel>
        <Select
          labelId="catalog-category-label"
          value={category}
          label="Categoria"
          onChange={(event) => onCategoryChange(String(event.target.value))}
        >
          <MenuItem value="">Todas</MenuItem>
          {categories.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel id="catalog-manufacturer-label">Fabricante</InputLabel>
        <Select
          labelId="catalog-manufacturer-label"
          value={manufacturer}
          label="Fabricante"
          onChange={(event) => onManufacturerChange(String(event.target.value))}
        >
          <MenuItem value="">Todos</MenuItem>
          {manufacturers.map((item) => (
            <MenuItem key={item} value={item}>
              {item}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel id="catalog-availability-label">Disponibilidade</InputLabel>
        <Select
          labelId="catalog-availability-label"
          value={availability}
          label="Disponibilidade"
          onChange={(event) => onAvailabilityChange(event.target.value as AvailabilityFilter)}
        >
          <MenuItem value="all">Todos</MenuItem>
          <MenuItem value="in-stock">Com estoque</MenuItem>
          <MenuItem value="out-of-stock">Sem estoque</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel id="catalog-promo-label">Promocoes</InputLabel>
        <Select
          labelId="catalog-promo-label"
          value={promo}
          label="Promocoes"
          onChange={(event) => onPromoChange(event.target.value as PromoFilter)}
        >
          <MenuItem value="all">Todas</MenuItem>
          <MenuItem value="promo">Apenas em promocao</MenuItem>
        </Select>
      </FormControl>

      <FormControl fullWidth size="small">
        <InputLabel id="catalog-sort-label">Ordenar por</InputLabel>
        <Select
          labelId="catalog-sort-label"
          value={sort}
          label="Ordenar por"
          onChange={(event) => onSortChange(event.target.value as SortOption)}
        >
          <MenuItem value="best-sellers">Mais vendidos</MenuItem>
          <MenuItem value="discount-desc">Maior desconto</MenuItem>
          <MenuItem value="newest">Mais recentes</MenuItem>
          <MenuItem value="price-asc">Menor preco</MenuItem>
          <MenuItem value="price-desc">Maior preco</MenuItem>
          <MenuItem value="name-asc">Nome (A-Z)</MenuItem>
          <MenuItem value="name-desc">Nome (Z-A)</MenuItem>
        </Select>
      </FormControl>

      <Box>
        <Typography component="p" variant="subtitle2" sx={{ mb: 0.7, color: 'text.secondary' }}>
          Faixa de preco
        </Typography>
        <Slider
          value={priceRange}
          onChange={(_event, value) => onPriceRangeChange(value as [number, number])}
          getAriaLabel={(index) => (index === 0 ? 'Preco minimo' : 'Preco maximo')}
          getAriaValueText={(value) => formatCurrency(value)}
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={10}
          valueLabelDisplay="auto"
        />
        <Typography variant="caption" color="text.secondary">
          {formatCurrency(priceRange[0])} - {formatCurrency(priceRange[1])}
        </Typography>
      </Box>

      <Stack direction="row" spacing={1}>
        <Button data-testid="catalog-apply-filters" variant="contained" color="primary" onClick={onApply} fullWidth>
          Aplicar filtros
        </Button>
        <Button data-testid="catalog-clear-filters" variant="outlined" color="primary" onClick={onClear} fullWidth>
          Limpar
        </Button>
      </Stack>
    </Stack>
  )
}

export default function CatalogPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { status } = useAuth()
  const { completeStep } = useAssist()
  const [searchParams, setSearchParams] = useSearchParams()
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [reviewRating, setReviewRating] = useState<number>(5)
  const [reviewMessage, setReviewMessage] = useState('')
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null)

  const search = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const manufacturer = searchParams.get('manufacturer') || ''
  const availability = (searchParams.get('availability') || 'all') as AvailabilityFilter
  const promo = searchParams.get('promo') === 'true' ? 'promo' : 'all'
  const sort = (searchParams.get('sort') || 'best-sellers') as SortOption
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const minPrice = Number(searchParams.get('minPrice') || String(PRICE_MIN))
  const maxPrice = Number(searchParams.get('maxPrice') || String(PRICE_MAX))

  const [draftSearch, setDraftSearch] = useState(search)
  const [draftCategory, setDraftCategory] = useState(category)
  const [draftManufacturer, setDraftManufacturer] = useState(manufacturer)
  const [draftAvailability, setDraftAvailability] = useState<AvailabilityFilter>(availability)
  const [draftPromo, setDraftPromo] = useState<PromoFilter>(promo)
  const [draftSort, setDraftSort] = useState<SortOption>(sort)
  const [draftPriceRange, setDraftPriceRange] = useState<[number, number]>([
    Number.isFinite(minPrice) ? minPrice : PRICE_MIN,
    Number.isFinite(maxPrice) ? maxPrice : PRICE_MAX,
  ])

  useEffect(() => {
    setDraftSearch(search)
    setDraftCategory(category)
    setDraftManufacturer(manufacturer)
    setDraftAvailability(availability)
    setDraftPromo(promo)
    setDraftSort(sort)
    setDraftPriceRange([
      Number.isFinite(minPrice) ? minPrice : PRICE_MIN,
      Number.isFinite(maxPrice) ? maxPrice : PRICE_MAX,
    ])
  }, [search, category, manufacturer, availability, promo, sort, minPrice, maxPrice])

  const inStock = availability === 'all' ? undefined : availability === 'in-stock'

  const productsQuery = useQuery({
    queryKey: ['catalog-products', search, category, manufacturer, availability, promo, sort, page, minPrice, maxPrice],
    queryFn: () =>
      api.listPublicProducts({
        q: search || undefined,
        category: category || undefined,
        manufacturer: manufacturer || undefined,
        inStock,
        promo: promo === 'promo' ? true : undefined,
        sort,
        page,
        pageSize: PAGE_SIZE,
        minPrice,
        maxPrice,
        onlyWithImage: true,
      }),
    placeholderData: keepPreviousData,
  })

  const categoriesQuery = useQuery({
    queryKey: ['catalog-categories-source'],
    queryFn: () => api.listPublicProducts({ page: 1, pageSize: 240, sort: 'name-asc', onlyWithImage: true }),
  })

  const productReviewsQuery = useQuery({
    queryKey: ['catalog-product-comments', selectedProduct?.id],
    enabled: Boolean(selectedProduct?.id),
    queryFn: () => api.listComments({ limit: 5, productId: Number(selectedProduct?.id) }),
  })

  const createReviewMutation = useMutation({
    mutationFn: (payload: { productId: number; rating: number; message: string }) => api.createComment(payload),
    onSuccess: async () => {
      setReviewFeedback('Avaliacao publicada com sucesso.')
      setReviewMessage('')
      setReviewRating(5)
      await queryClient.invalidateQueries({ queryKey: ['catalog-product-comments', selectedProduct?.id] })
      await queryClient.invalidateQueries({ queryKey: ['home-comments'] })
    },
  })

  const items = productsQuery.data?.items ?? []
  const meta = productsQuery.data?.meta

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const item of categoriesQuery.data?.items ?? []) {
      if (item.category) set.add(item.category)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [categoriesQuery.data?.items])

  const manufacturers = useMemo(() => {
    const set = new Set<string>()
    for (const item of categoriesQuery.data?.items ?? []) {
      if (item.manufacturer) set.add(item.manufacturer)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [categoriesQuery.data?.items])

  const errorMessage = productsQuery.error instanceof ApiError ? productsQuery.error.message : null
  const reviewError = createReviewMutation.error instanceof ApiError ? createReviewMutation.error.message : null
  const showingStart = (meta?.total ?? 0) === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const showingEnd = (page - 1) * PAGE_SIZE + items.length

  function applyFilters() {
    const next = buildSearchParamsPatch(searchParams, {
      q: draftSearch.trim() || null,
      category: draftCategory || null,
      manufacturer: draftManufacturer || null,
      availability: draftAvailability === 'all' ? null : draftAvailability,
      promo: draftPromo === 'promo' ? 'true' : null,
      sort: draftSort,
      minPrice: draftPriceRange[0] === PRICE_MIN ? null : draftPriceRange[0],
      maxPrice: draftPriceRange[1] === PRICE_MAX ? null : draftPriceRange[1],
      page: 1,
    })
    setSearchParams(next)
    setMobileFiltersOpen(false)
    completeStep('filter-applied', 'catalog')
  }

  function clearFilters() {
    setDraftSearch('')
    setDraftCategory('')
    setDraftManufacturer('')
    setDraftAvailability('all')
    setDraftPromo('all')
    setDraftSort('best-sellers')
    setDraftPriceRange([PRICE_MIN, PRICE_MAX])
    setSearchParams(new URLSearchParams({ sort: 'best-sellers', page: '1' }))
    setMobileFiltersOpen(false)
  }

  function openReviewModal(product: Product) {
    if (status !== 'authenticated') {
      navigate('/auth')
      return
    }
    setSelectedProduct(product)
    setReviewRating(5)
    setReviewMessage('')
    setReviewFeedback(null)
  }

  async function submitReview() {
    if (!selectedProduct) return
    await createReviewMutation.mutateAsync({
      productId: selectedProduct.id,
      rating: Math.max(1, Math.min(5, Math.round(reviewRating))),
      message: reviewMessage.trim(),
    })
  }

  const prefetchProductDetails = useMemo(
    () =>
      (product: Product) => {
        if (!Number.isInteger(Number(product.id)) || Number(product.id) <= 0) return
        void queryClient.prefetchQuery({
          queryKey: ['product-details', Number(product.id)],
          queryFn: () => api.getPublicProduct(Number(product.id)),
          staleTime: 30_000,
        })
      },
    [queryClient],
  )

  return (
    <AppShell contained={false}>
      <Stack spacing={{ xs: 2, md: 3 }}>
        <Paper
          className="store-section"
          elevation={0}
          sx={{
            p: { xs: 1.4, md: 2.2 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: { xs: 'divider', md: 'divider' },
            bgcolor: { xs: 'transparent', md: 'background.paper' },
          }}
        >
          <Stack spacing={{ xs: 0.6, md: 1 }}>
            <Breadcrumbs separator={<NavigateNextRoundedIcon size="sm" />}>
              <Typography component={RouterLink} to="/" variant="body2" color="text.secondary" sx={{ color: { xs: 'text.secondary', md: 'text.secondary' } }}>
                Inicio
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ color: { xs: 'text.secondary', md: 'text.secondary' } }}>
                Catalogo
              </Typography>
              {category ? <Typography variant="body2" sx={{ color: { xs: 'text.primary', md: 'text.primary' } }}>{category}</Typography> : null}
            </Breadcrumbs>
            <Typography variant="h3" sx={{ color: { xs: 'text.primary', md: 'text.primary' } }}>
              Catalogo de pecas
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ color: { xs: 'text.secondary', md: 'text.secondary' } }}>
              Filtros reais por categoria, fabricante, preco, promocao, disponibilidade e ordenacao.
            </Typography>
          </Stack>
        </Paper>

        <Grid container spacing={{ xs: 1.6, md: 2.2 }} alignItems="flex-start">
          <Grid size={{ xs: 12, lg: 3 }}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', position: { lg: 'sticky' }, top: { lg: 110 }, display: { xs: 'none', lg: 'block' } }}>
              <FiltersPanel
                search={draftSearch}
                onSearchChange={setDraftSearch}
                category={draftCategory}
                onCategoryChange={setDraftCategory}
                categories={categories}
                manufacturer={draftManufacturer}
                onManufacturerChange={setDraftManufacturer}
                manufacturers={manufacturers}
                availability={draftAvailability}
                onAvailabilityChange={setDraftAvailability}
                promo={draftPromo}
                onPromoChange={setDraftPromo}
                sort={draftSort}
                onSortChange={setDraftSort}
                priceRange={draftPriceRange}
                onPriceRangeChange={setDraftPriceRange}
                onApply={applyFilters}
                onClear={clearFilters}
              />
            </Paper>

            <Button
              variant="outlined"
              color="primary"
              fullWidth
              startIcon={<FilterListRoundedIcon size="sm" />}
              onClick={() => setMobileFiltersOpen(true)}
              sx={{
                display: { xs: 'inline-flex', lg: 'none' },
                minHeight: 44,
                borderRadius: 2.5,
                bgcolor: { xs: '#FFFDF7', lg: 'transparent' },
                color: { xs: 'primary.main', lg: 'primary.main' },
                borderColor: { xs: 'divider', lg: 'primary.main' },
              }}
            >
              Filtros e ordenacao
            </Button>
            <AssistHintInline tipId="catalog-tip-filter" routeKey="catalog">
              Dica: aplique filtros antes de decidir a compra.
            </AssistHintInline>
          </Grid>

          <Grid size={{ xs: 12, lg: 9 }}>
            <Paper elevation={0} sx={{ p: { xs: 1.2, md: 2 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: { xs: 1.6, md: 2 } }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.2}>
                <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                  <Chip label={`${meta?.total ?? 0} produtos`} size="small" />
                  {search ? <Chip label={`Busca: ${search}`} size="small" /> : null}
                  {category ? <Chip label={`Categoria: ${category}`} size="small" /> : null}
                  {manufacturer ? <Chip label={`Fabricante: ${manufacturer}`} size="small" /> : null}
                  {promo === 'promo' ? <Chip label="Somente promocao" size="small" color="warning" /> : null}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Mostrando {showingStart} - {showingEnd} de {meta?.total ?? 0} produtos
                </Typography>
              </Stack>
            </Paper>

            {errorMessage ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {errorMessage}
              </Alert>
            ) : null}

            {productsQuery.isLoading ? (
              <Grid container spacing={2}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Grid key={`catalog-skeleton-${index}`} size={{ xs: 12, md: 6, xl: 4 }}>
                    <Paper elevation={0} sx={{ p: 2, borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
                      <Stack spacing={1.1}>
                        <Skeleton variant="text" width={140} />
                        <Skeleton variant="rounded" sx={{ width: '100%', height: 170 }} />
                        <Skeleton variant="text" width={100} />
                        <Skeleton variant="rounded" height={44} />
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : items.length === 0 ? (
              <Paper elevation={0} sx={{ p: { xs: 2.6, md: 4 }, borderRadius: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                <Typography component="h4" variant="h6" sx={{ color: 'text.primary', mb: 0.8 }}>
                  Nenhum produto encontrado
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Ajuste os filtros ou limpe a busca para ver outros itens.
                </Typography>
                <Button variant="outlined" color="primary" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {items.map((item) => (
                  <Grid key={item.id} size={{ xs: 12, md: 6, xl: 4 }}>
                    <ProductCard
                      item={item}
                      onRequestReview={openReviewModal}
                      onOpenDetails={(product) => navigate(buildProductUrl(product))}
                      onPrefetchDetails={prefetchProductDetails}
                    />
                  </Grid>
                ))}
              </Grid>
            )}

            <Stack alignItems="center" sx={{ mt: { xs: 1.6, md: 2.5 } }}>
              <Pagination
                data-testid="catalog-pagination"
                count={Math.max(meta?.totalPages || 1, 1)}
                page={page}
                color="primary"
                shape="rounded"
                onChange={(_event, nextPage) => {
                  setSearchParams(buildSearchParamsPatch(searchParams, { page: nextPage }))
                }}
              />
            </Stack>
          </Grid>
        </Grid>
      </Stack>

      <Drawer
        anchor="right"
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        PaperProps={{
          sx: {
            width: 'min(88vw, 360px)',
            p: 2,
            bgcolor: 'background.default',
            color: 'text.primary',
          },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography component="h4" variant="h6" sx={{ color: 'text.primary' }}>
            Filtros
          </Typography>
          <IconButton onClick={() => setMobileFiltersOpen(false)}>
            <CloseRoundedIcon size="md" />
          </IconButton>
        </Stack>
        <FiltersPanel
          search={draftSearch}
          onSearchChange={setDraftSearch}
          category={draftCategory}
          onCategoryChange={setDraftCategory}
          categories={categories}
          manufacturer={draftManufacturer}
          onManufacturerChange={setDraftManufacturer}
          manufacturers={manufacturers}
          availability={draftAvailability}
          onAvailabilityChange={setDraftAvailability}
          promo={draftPromo}
          onPromoChange={setDraftPromo}
          sort={draftSort}
          onSortChange={setDraftSort}
          priceRange={draftPriceRange}
          onPriceRangeChange={setDraftPriceRange}
          onApply={applyFilters}
          onClear={clearFilters}
        />
      </Drawer>

      <Dialog
        open={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Avaliar produto</DialogTitle>
        <DialogContent>
          <Stack spacing={1.4} sx={{ pt: 0.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {selectedProduct?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Comentario real vinculado ao usuario e ao produto.
            </Typography>

            {productReviewsQuery.data?.summaryByProduct ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <Rating value={productReviewsQuery.data.summaryByProduct.averageRating} readOnly precision={0.1} />
                <Typography variant="caption" color="text.secondary">
                  {productReviewsQuery.data.summaryByProduct.averageRating.toFixed(1)} ({productReviewsQuery.data.summaryByProduct.totalReviews} avaliacoes)
                </Typography>
              </Stack>
            ) : null}

            <Stack spacing={0.4}>
              <Typography variant="caption" color="text.secondary">Nota</Typography>
              <Rating value={reviewRating} onChange={(_, value) => setReviewRating(value || 5)} precision={1} />
            </Stack>

            <TextField
              inputProps={{ 'data-testid': 'catalog-review-message-input' }}
              label="Comentario"
              multiline
              minRows={3}
              value={reviewMessage}
              onChange={(event) => setReviewMessage(event.target.value)}
              helperText="Minimo de 8 caracteres."
            />

            {reviewError ? <Alert severity="error">{reviewError}</Alert> : null}
            {reviewFeedback ? <Alert severity="success">{reviewFeedback}</Alert> : null}

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.8 }}>
                Comentarios recentes do produto
              </Typography>
              {productReviewsQuery.isLoading ? (
                <Stack spacing={0.8}>
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="65%" />
                </Stack>
              ) : (productReviewsQuery.data?.items || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Este produto ainda nao possui avaliacoes publicadas.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {productReviewsQuery.data?.items.map((review) => (
                    <Paper key={review.id} elevation={0} sx={{ p: 1.2, border: '1px solid', borderColor: 'divider' }}>
                      <Stack spacing={0.4}>
                        <Rating value={review.rating} readOnly size="small" />
                        <Typography variant="body2" color="text.secondary">
                          "{review.message}"
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {review.authorName}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedProduct(null)} variant="text" color="inherit">
            Fechar
          </Button>
          <Button
            data-testid="catalog-review-submit-button"
            onClick={() => void submitReview()}
            variant="contained"
            color="primary"
            disabled={createReviewMutation.isPending || reviewMessage.trim().length < 8}
          >
            {createReviewMutation.isPending ? 'Publicando...' : 'Publicar avaliacao'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(reviewFeedback)} autoHideDuration={2600} onClose={() => setReviewFeedback(null)}>
        <Alert severity="success" variant="filled" onClose={() => setReviewFeedback(null)}>
          {reviewFeedback}
        </Alert>
      </Snackbar>
    </AppShell>
  )
}
