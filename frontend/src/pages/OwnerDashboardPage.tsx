import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  Divider,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import OwnerLayout from '../layouts/OwnerLayout'
import { api, ApiError, type OwnerDashboardParams, type OwnerDashboardResponse } from '../lib/api'
import { useAssist } from '../context/AssistContext'
import { AssistHintInline } from '../components/assist'

type SortDirection = 'asc' | 'desc'
type SortBy = OwnerDashboardParams['sortBy']

const DASHBOARD_PAGE_SIZE = 20

const defaultFilters: OwnerDashboardParams = {
  period: 'month',
  status: 'all',
  sortBy: 'revenue',
  direction: 'desc',
  page: 1,
  pageSize: DASHBOARD_PAGE_SIZE,
}

export default function OwnerDashboardPage() {
  const { completeStep } = useAssist()
  const [filters, setFilters] = useState<OwnerDashboardParams>(defaultFilters)
  const [dashboard, setDashboard] = useState<OwnerDashboardResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const latestRequestRef = useRef(0)
  const kpiStepMarkedRef = useRef(false)

  const categoryOptions = useMemo(
    () => dashboard?.facets?.categories || [],
    [dashboard?.facets?.categories],
  )

  const manufacturerOptions = useMemo(
    () => dashboard?.facets?.manufacturers || [],
    [dashboard?.facets?.manufacturers],
  )

  const loadDashboard = useCallback(async (nextFilters: OwnerDashboardParams) => {
    const requestId = Date.now() + Math.random()
    latestRequestRef.current = requestId
    setLoading(true)
    setError(null)
    try {
      const data = await api.ownerDashboard(nextFilters)
      if (latestRequestRef.current !== requestId) return
      setDashboard(data)
    } catch (err) {
      if (latestRequestRef.current !== requestId) return
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar dashboard de produtos.')
    } finally {
      if (latestRequestRef.current === requestId) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!dashboard || kpiStepMarkedRef.current) return
    kpiStepMarkedRef.current = true
    completeStep('kpi-read', 'owner-dashboard')
  }, [dashboard, completeStep])

  useEffect(() => {
    void loadDashboard(filters)
  }, [filters, loadDashboard])

  const handleFilterChange = useCallback((patch: Partial<OwnerDashboardParams>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }))
  }, [])

  const handlePeriodChange = useCallback((period: OwnerDashboardParams['period']) => {
    setFilters((prev) => {
      if (period !== 'custom') {
        return { ...prev, period, startAt: undefined, endAt: undefined, page: 1 }
      }

      const now = new Date()
      const start = new Date(now)
      start.setDate(now.getDate() - 29)
      return {
        ...prev,
        period: 'custom',
        startAt: prev.startAt || start.toISOString(),
        endAt: prev.endAt || now.toISOString(),
        page: 1,
      }
    })
    completeStep('period-filter', 'owner-dashboard')
  }, [completeStep])

  const handleSort = useCallback((sortBy: SortBy) => {
    setFilters((prev) => {
      const currentSortBy = prev.sortBy || 'revenue'
      const currentDirection = (prev.direction || 'desc') as SortDirection
      const nextDirection: SortDirection = currentSortBy === sortBy && currentDirection === 'desc' ? 'asc' : 'desc'
      return {
        ...prev,
        sortBy,
        direction: nextDirection,
        page: 1,
      }
    })
  }, [])

  const handleExportCsv = useCallback(async () => {
    setExporting(true)
    setError(null)
    try {
      const data = await api.ownerDashboard({ ...filters, page: 1, pageSize: 500 })
      const rows = data.products.items
      const header = [
        'SKU',
        'Nome',
        'Categoria',
        'Fabricante',
        'Preco',
        'Custo',
        'MargemPercentual',
        'Estoque',
        'EstoqueMinimo',
        'Reposicao',
        'UnidadesVendidas',
        'Receita',
        'Conversao',
        'Views',
        'AddToCart',
        'CheckoutStart',
        'Compras',
        'RatingMedio',
        'Avaliacoes',
        'Status',
      ]
      const toCsvValue = (value: string | number | null | undefined) => {
        const safe = String(value ?? '')
        if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
          return `"${safe.replace(/"/g, '""')}"`
        }
        return safe
      }
      const body = rows.map((row) => [
        row.sku,
        row.name,
        row.category,
        row.manufacturer,
        row.price.toFixed(2),
        row.cost.toFixed(2),
        row.marginPercent.toFixed(2),
        row.stock,
        row.minimumStock,
        row.reorderPoint,
        row.unitsSold,
        row.revenue.toFixed(2),
        row.conversionRate.toFixed(2),
        row.views,
        row.addToCart,
        row.checkoutStart,
        row.purchases,
        row.averageRating.toFixed(2),
        row.reviewCount,
        row.status,
      ].map(toCsvValue).join(','))

      const csv = [header.join(','), ...body].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `dashboard-produtos-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao exportar CSV.')
    } finally {
      setExporting(false)
    }
  }, [filters])

  const metrics = dashboard?.metrics
  const products = dashboard?.products.items || []
  const productMeta = dashboard?.products.meta
  const periodIsCustom = (filters.period || 'month') === 'custom'
  const metricsDelta = metrics?.metricDelta

  const metricCards = [
    { label: 'Receita', value: toCurrency(metrics?.revenueTotal), helper: 'Periodo selecionado', delta: metricsDelta?.revenueTotal },
    { label: 'Ticket medio', value: toCurrency(metrics?.ticketAverage), helper: 'Receita / pedidos', delta: metricsDelta?.ticketAverage },
    { label: 'Lucro bruto', value: toCurrency(metrics?.grossProfitTotal), helper: 'Margem agregada no periodo' },
    { label: 'Unidades vendidas', value: String(metrics?.unitsSold || 0), helper: 'Volume no periodo', delta: metricsDelta?.unitsSold },
    { label: 'Margem media', value: `${Number(metrics?.averageMargin || 0).toFixed(1)}%`, helper: 'Media do portfolio', delta: metricsDelta?.averageMargin },
    { label: 'Conversao media', value: `${Number(metrics?.averageConversion || 0).toFixed(2)}%`, helper: 'Compras / visualizacoes', delta: metricsDelta?.averageConversion },
    { label: 'Avaliacao media', value: Number(metrics?.averageRating || 0).toFixed(2), helper: `${metrics?.totalComments || 0} reviews reais`, delta: metricsDelta?.averageRating },
    { label: 'Ativos / Inativos', value: `${metrics?.activeProducts || 0} / ${metrics?.inactiveProducts || 0}`, helper: 'Status de catalogo' },
    {
      label: 'Sem estoque',
      value: String(metrics?.outOfStockProducts || 0),
      helper: 'Ruptura atual',
      delta: metricsDelta?.outOfStockProducts,
      inverseDelta: true,
    },
    {
      label: 'Estoque critico',
      value: String(metrics?.criticalStockProducts || 0),
      helper: 'Abaixo do minimo',
      delta: metricsDelta?.criticalStockProducts,
      inverseDelta: true,
    },
    { label: 'Devolucoes', value: String(metrics?.totalReturns || 0), helper: `${metrics?.returnedUnits || 0} unidades retornadas` },
    { label: 'Reclamacoes abertas', value: String(metrics?.openComplaints || 0), helper: 'Atendimento pendente', inverseDelta: true },
  ]

  return (
    <OwnerLayout>
      <Stack spacing={2.2} aria-busy={loading || exporting ? 'true' : 'false'}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.2}>
          <Box>
            <Typography variant="h4" sx={{ color: 'text.primary', lineHeight: 1.05 }}>
              Dashboard de produtos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Analise performance, estoque, margem e funil para cada item do catalogo.
            </Typography>
            <Box sx={{ mt: 1.1, maxWidth: 520 }}>
              <AssistHintInline tipId="owner-dashboard-tip-kpi" routeKey="owner-dashboard">
                Dica: valide período e depois compare Receita, Conversão e Estoque crítico.
              </AssistHintInline>
            </Box>
          </Box>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{
              width: { xs: '100%', md: 'auto' },
              alignItems: 'stretch',
              justifyContent: { sm: 'flex-end' },
            }}
          >
            <Button
              data-testid="owner-dashboard-export-csv-button"
              variant="outlined"
              color="primary"
              onClick={handleExportCsv}
              disabled={exporting || loading}
              sx={{
                minHeight: 42,
                minWidth: { sm: 152 },
                width: { xs: '100%', sm: 152 },
                whiteSpace: 'nowrap',
              }}
            >
              {exporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>
            <Button
              data-testid="owner-dashboard-refresh-button"
              variant="contained"
              color="primary"
              onClick={() => void loadDashboard(filters)}
              disabled={loading || exporting}
              startIcon={(
                <Box sx={{ width: 16, height: 16, display: 'inline-grid', placeItems: 'center' }}>
                  {loading ? <CircularProgress size={14} color="inherit" /> : null}
                </Box>
              )}
              sx={{
                minHeight: 42,
                minWidth: { sm: 152 },
                width: { xs: '100%', sm: 152 },
                whiteSpace: 'nowrap',
              }}
            >
              Atualizar
            </Button>
          </Stack>
        </Stack>

        <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
          <Grid container spacing={1.2}>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="owner-dashboard-period-label">Periodo</InputLabel>
                <Select
                  labelId="owner-dashboard-period-label"
                  value={filters.period || 'month'}
                  label="Periodo"
                  onChange={(event) => handlePeriodChange(event.target.value as OwnerDashboardParams['period'])}
                >
                  <MenuItem value="day">Ultimo dia</MenuItem>
                  <MenuItem value="week">Ultimos 7 dias</MenuItem>
                  <MenuItem value="month">Ultimos 30 dias</MenuItem>
                  <MenuItem value="custom">Personalizado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="owner-dashboard-status-label">Status</InputLabel>
                <Select
                  labelId="owner-dashboard-status-label"
                  value={filters.status || 'all'}
                  label="Status"
                  onChange={(event) => handleFilterChange({ status: event.target.value as OwnerDashboardParams['status'] })}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="active">Ativo</MenuItem>
                  <MenuItem value="draft">Rascunho/Inativo</MenuItem>
                  <MenuItem value="out-of-stock">Sem estoque</MenuItem>
                  <MenuItem value="critical">Estoque critico</MenuItem>
                  <MenuItem value="missing-image">Sem imagem</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="owner-dashboard-category-label">Categoria</InputLabel>
                <Select
                  labelId="owner-dashboard-category-label"
                  value={filters.category || ''}
                  label="Categoria"
                  onChange={(event) => handleFilterChange({ category: String(event.target.value || '') })}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {categoryOptions.map((item) => (
                    <MenuItem key={item} value={item}>{item}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="owner-dashboard-manufacturer-label">Marca</InputLabel>
                <Select
                  labelId="owner-dashboard-manufacturer-label"
                  value={filters.manufacturer || ''}
                  label="Marca"
                  onChange={(event) => handleFilterChange({ manufacturer: String(event.target.value || '') })}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {manufacturerOptions.map((item) => (
                    <MenuItem key={item} value={item}>{item}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 2.4 }}>
              <TextField
                fullWidth
                size="small"
                label="Busca"
                placeholder="SKU ou nome"
                value={filters.q || ''}
                onChange={(event) => handleFilterChange({ q: event.target.value })}
              />
            </Grid>
            {periodIsCustom ? (
              <>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Inicio"
                    InputLabelProps={{ shrink: true }}
                    value={formatDateInput(filters.startAt)}
                    onChange={(event) => {
                      const value = event.target.value
                      handleFilterChange({ startAt: value ? `${value}T00:00:00.000Z` : undefined })
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Fim"
                    InputLabelProps={{ shrink: true }}
                    value={formatDateInput(filters.endAt)}
                    onChange={(event) => {
                      const value = event.target.value
                      handleFilterChange({ endAt: value ? `${value}T23:59:59.999Z` : undefined })
                    }}
                  />
                </Grid>
              </>
            ) : null}
          </Grid>
        </Paper>

        {loading ? <LinearProgress color="primary" /> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}

        <Grid container spacing={1.2}>
          {metricCards.map((card) => (
            <MetricCard
              key={card.label}
              label={card.label}
              value={card.value}
              helper={card.helper}
              delta={card.delta}
              inverseDelta={card.inverseDelta}
            />
          ))}
        </Grid>

        <Grid container spacing={1.2}>
          <Grid size={{ xs: 12, lg: 4 }}>
            <RankingPanel title="Top 10 por receita" items={dashboard?.rankings.topRevenue || []} metricKey="revenue" format="currency" />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <RankingPanel title="Top 10 por unidades" items={dashboard?.rankings.topUnits || []} metricKey="unitsSold" format="int" />
          </Grid>
          <Grid size={{ xs: 12, lg: 4 }}>
            <RankingPanel title="Top 10 por margem" items={dashboard?.rankings.topMargin || []} metricKey="marginPercent" format="percent" />
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <RankingPanel title="Maior taxa de devolucao" items={dashboard?.rankings.highReturnRate || []} metricKey="returnRate" format="percent" />
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <RankingPanel title="Baixa conversao" items={dashboard?.rankings.lowConversion || []} metricKey="conversionRate" format="percent" />
          </Grid>
        </Grid>

        <Grid container spacing={1.2}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, height: '100%' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Gestao de estoque</Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.2 }}>
                <Chip label={`Critico: ${dashboard?.inventory.criticalStock.length || 0}`} color="error" size="small" />
                <Chip label={`Baixo: ${dashboard?.inventory.lowStock.length || 0}`} color="warning" size="small" />
                <Chip label={`Parados: ${dashboard?.inventory.stagnant.length || 0}`} size="small" />
                <Chip label={`Excesso: ${dashboard?.inventory.overstock.length || 0}`} color="success" size="small" />
              </Stack>
              <Stack spacing={0.8}>
                {(dashboard?.inventory.criticalStock || []).slice(0, 4).map((item) => (
                  <Stack key={String(item.id)} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                      {String(item.name)}
                    </Typography>
                    <Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>
                      {String(item.stock)} un.
                    </Typography>
                  </Stack>
                ))}
                {(dashboard?.inventory.stagnant || []).slice(0, 2).map((item) => (
                  <Stack key={`stagnant-${String(item.id)}`} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Parado: {String(item.name)}
                    </Typography>
                    <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>
                      {String(item.stock)} un.
                    </Typography>
                  </Stack>
                ))}
                {(dashboard?.inventory.criticalStock || []).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Sem itens criticos no filtro atual.</Typography>
                ) : null}
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 6 }}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2, height: '100%' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Funil por produto (agregado)</Typography>
              <Stack spacing={1}>
                <FunnelRow label="Visualizacoes" value={dashboard?.funnel.views || 0} ratio={100} />
                <FunnelRow label="Cliques" value={dashboard?.funnel.clicks || 0} ratio={Math.min(100, dashboard?.funnel.ctr || 0)} />
                <FunnelRow label="Adicoes ao carrinho" value={dashboard?.funnel.addToCart || 0} ratio={Math.min(100, dashboard?.funnel.addToCartRate || 0)} />
                <FunnelRow label="Inicio de checkout" value={dashboard?.funnel.checkoutStart || 0} ratio={Math.min(100, (dashboard?.funnel.purchaseRate || 0) * 1.35)} />
                <FunnelRow label="Compras" value={dashboard?.funnel.purchases || 0} ratio={Math.min(100, dashboard?.funnel.purchaseRate || 0)} />
              </Stack>
              <Divider sx={{ my: 1.2 }} />
              <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
                <Chip size="small" label={`CTR ${Number(dashboard?.funnel.ctr || 0).toFixed(2)}%`} />
                <Chip size="small" label={`Add-to-cart ${Number(dashboard?.funnel.addToCartRate || 0).toFixed(2)}%`} />
                <Chip size="small" label={`Abandono ${Number(dashboard?.funnel.abandonmentRate || 0).toFixed(2)}%`} />
              </Stack>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Qualidade e pos-venda</Typography>
              <Grid container spacing={1.2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Principais motivos de devolucao
                  </Typography>
                  <Stack spacing={0.7} sx={{ mt: 0.8 }}>
                    {(dashboard?.quality?.topReturnReasons || []).slice(0, 6).map((reason) => (
                      <Stack key={reason.label} direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" sx={{ color: 'text.primary' }}>{reason.label}</Typography>
                        <Chip size="small" label={`${reason.total}`} />
                      </Stack>
                    ))}
                    {(dashboard?.quality?.topReturnReasons || []).length === 0 ? (
                      <Typography variant="body2" color="text.secondary">Sem devolucoes registradas no periodo.</Typography>
                    ) : null}
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Reclamacoes por severidade
                  </Typography>
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.8 }}>
                    {(dashboard?.quality?.complaintsBySeverity || []).map((bucket) => (
                      <Chip
                        key={bucket.severity}
                        size="small"
                        color={bucket.severity === 'high' ? 'error' : bucket.severity === 'medium' ? 'warning' : 'default'}
                        label={`${capitalize(bucket.severity)}: ${bucket.total}`}
                      />
                    ))}
                    <Chip size="small" color={dashboard?.quality?.complaintsOpen ? 'warning' : 'success'} label={`Abertas: ${dashboard?.quality?.complaintsOpen || 0}`} />
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>

        <Paper elevation={0} sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Receita diaria no periodo</Typography>
          <Stack spacing={0.6}>
            {(dashboard?.trend || []).slice(-12).map((point) => (
              <Stack key={point.date} direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">{new Date(point.date).toLocaleDateString('pt-BR')}</Typography>
                <Typography variant="caption" sx={{ color: 'text.primary' }}>
                  {toCurrency(point.revenue)} • {point.units} un.
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: 2 }}>
          <Box data-testid="owner-dashboard-table-scroll" sx={{ width: '100%', overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 1500 }}>
            <TableHead>
              <TableRow>
                <SortableHead label="SKU" active={filters.sortBy === 'sku'} onClick={() => handleSort('sku')} direction={filters.direction || 'desc'} />
                <SortableHead label="Nome" active={filters.sortBy === 'name'} onClick={() => handleSort('name')} direction={filters.direction || 'desc'} />
                <TableCell>Categoria</TableCell>
                <SortableHead label="Preco" active={filters.sortBy === 'price'} onClick={() => handleSort('price')} direction={filters.direction || 'desc'} />
                <SortableHead label="Custo" active={filters.sortBy === 'cost'} onClick={() => handleSort('cost')} direction={filters.direction || 'desc'} />
                <SortableHead label="Margem" active={filters.sortBy === 'margin'} onClick={() => handleSort('margin')} direction={filters.direction || 'desc'} />
                <SortableHead label="Estoque" active={filters.sortBy === 'stock'} onClick={() => handleSort('stock')} direction={filters.direction || 'desc'} />
                <SortableHead label="Vendas" active={filters.sortBy === 'unitsSold'} onClick={() => handleSort('unitsSold')} direction={filters.direction || 'desc'} />
                <SortableHead label="Receita" active={filters.sortBy === 'revenue'} onClick={() => handleSort('revenue')} direction={filters.direction || 'desc'} />
                <SortableHead label="Conversao" active={filters.sortBy === 'conversion'} onClick={() => handleSort('conversion')} direction={filters.direction || 'desc'} />
                <TableCell>Rating</TableCell>
                <TableCell>Devolucao</TableCell>
                <TableCell>Reclamacoes</TableCell>
                <SortableHead label="Status" active={filters.sortBy === 'status'} onClick={() => handleSort('status')} direction={filters.direction || 'desc'} />
                <TableCell align="right">Acoes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 1.2 }}>
                      Nenhum produto encontrado para os filtros aplicados.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : products.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>
                    <Stack spacing={0.2}>
                      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>{item.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{item.manufacturer}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{toCurrency(item.price)}</TableCell>
                  <TableCell>{toCurrency(item.cost)}</TableCell>
                  <TableCell>{item.marginPercent.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={item.stockHealth === 'critical' ? 'error' : item.stockHealth === 'low' ? 'warning' : 'success'}
                      label={`${item.stock} un.`}
                    />
                  </TableCell>
                  <TableCell>{item.unitsSold}</TableCell>
                  <TableCell>{toCurrency(item.revenue)}</TableCell>
                  <TableCell>{item.conversionRate.toFixed(2)}%</TableCell>
                  <TableCell>{item.averageRating.toFixed(1)} ({item.reviewCount})</TableCell>
                  <TableCell>{item.returnRate.toFixed(2)}%</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={item.openComplaints > 0 ? 'warning' : 'default'}
                      label={item.openComplaints}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={normalizeStatusLabel(item.status)} />
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="primary"
                      component={RouterLink}
                      to={`/owner/products/${item.id}/edit`}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </Box>
        </Paper>

        {productMeta && productMeta.totalPages > 1 ? (
          <Stack alignItems="center" sx={{ py: 1 }}>
            <Pagination
              page={productMeta.page}
              count={productMeta.totalPages}
              color="primary"
              onChange={(_event, value) => setFilters((prev) => ({ ...prev, page: value, pageSize: DASHBOARD_PAGE_SIZE }))}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              Mostrando {products.length} de {productMeta.total} produto(s)
            </Typography>
          </Stack>
        ) : null}
      </Stack>
    </OwnerLayout>
  )
}

function MetricCard({
  label,
  value,
  helper,
  delta,
  inverseDelta = false,
}: {
  label: string
  value: string
  helper: string
  delta?: number
  inverseDelta?: boolean
}) {
  const formattedDelta = typeof delta === 'number' ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%` : null
  const deltaColor = typeof delta !== 'number'
    ? 'text.secondary'
    : inverseDelta
      ? delta > 0 ? 'error.main' : 'success.main'
      : delta > 0 ? 'success.main' : delta < 0 ? 'error.main' : 'text.secondary'

  return (
    <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
      <Paper elevation={0} sx={{ p: 1.8, borderRadius: 2, height: '100%' }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ color: 'text.primary', mt: 0.35 }}>{value}</Typography>
        <Stack direction="row" spacing={0.8} alignItems="center" useFlexGap flexWrap="wrap">
          <Typography variant="caption" color="text.secondary">{helper}</Typography>
          {formattedDelta ? (
            <Typography variant="caption" sx={{ color: deltaColor, fontWeight: 700 }}>
              {formattedDelta}
            </Typography>
          ) : null}
        </Stack>
      </Paper>
    </Grid>
  )
}

function RankingPanel({
  title,
  items,
  metricKey,
  format,
}: {
  title: string
  items: Array<Record<string, unknown>>
  metricKey: 'revenue' | 'unitsSold' | 'marginPercent' | 'conversionRate' | 'returnRate'
  format: 'currency' | 'int' | 'percent'
}) {
  const formatMetric = (value: unknown) => {
    const numeric = Number(value || 0)
    if (format === 'currency') return toCurrency(numeric)
    if (format === 'percent') return `${numeric.toFixed(2)}%`
    return String(Math.round(numeric))
  }

  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, height: '100%' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>{title}</Typography>
      <Stack spacing={0.8}>
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Sem dados para o periodo selecionado.</Typography>
        ) : items.map((item) => (
          <Stack key={String(item.id)} direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {String(item.name)}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              {formatMetric(item[metricKey])}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Paper>
  )
}

function FunnelRow({ label, value, ratio }: { label: string; value: number; ratio: number }) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.4 }}>
        <Typography variant="body2" color="text.primary">{label}</Typography>
        <Typography variant="caption" color="text.secondary">{value}</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, ratio))} color="primary" />
    </Box>
  )
}

function SortableHead({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: SortDirection
  onClick: () => void
}) {
  return (
    <TableCell>
      <Button
        size="small"
        color={active ? 'primary' : 'inherit'}
        onClick={onClick}
        sx={{ p: 0, minWidth: 0, fontWeight: 700, justifyContent: 'flex-start', textTransform: 'none' }}
      >
        {label}{active ? (direction === 'desc' ? ' ↓' : ' ↑') : ''}
      </Button>
    </TableCell>
  )
}

function normalizeStatusLabel(status: string) {
  switch (status) {
    case 'active':
      return 'Ativo'
    case 'out-of-stock':
      return 'Sem estoque'
    case 'missing-image':
      return 'Sem imagem'
    case 'inactive':
      return 'Inativo'
    case 'draft':
      return 'Rascunho'
    default:
      return status
  }
}

function formatDateInput(value: string | undefined) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

function capitalize(value: string) {
  const safe = String(value || '').trim()
  if (!safe) return ''
  return safe.charAt(0).toUpperCase() + safe.slice(1)
}

function toCurrency(value: number | undefined) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(Number(value || 0))
}
