import { Box, Button, Divider, Grid, Paper, Stack, Typography } from '@mui/material'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Link as RouterLink } from 'react-router-dom'
import PublicLayout from '../layouts/PublicLayout'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'

function formatPrice(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const reveal = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
} as const

export default function CartPage() {
  const { items, total, itemCount, loading, updateQty, removeItem, clear } = useCart()
  const { status } = useAuth()
  const prefersReducedMotion = useReducedMotion()

  return (
    <PublicLayout>
      <Stack spacing={{ xs: 2.5, md: 3.5 }}>
        <Paper
          component={motion.div}
          initial={prefersReducedMotion ? false : 'hidden'}
          animate="visible"
          variants={reveal}
          elevation={0}
          sx={{
            p: { xs: 2, md: 2.5 },
            borderRadius: 3,
            border: '1px solid rgba(12,22,44,0.08)',
            bgcolor: 'rgba(255,255,255,0.9)',
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="caption" sx={{ color: 'primary.main', letterSpacing: '0.12em' }}>
                MOCHILA
              </Typography>
              <Typography variant="h3" sx={{ color: 'info.main', letterSpacing: '-0.03em' }}>
                Itens selecionados
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {status === 'authenticated'
                  ? 'Sincronizada com sua conta.'
                  : 'Local neste navegador. Entre para sincronizar.'}
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Stack direction={{ xs: 'row', md: 'column' }} spacing={1}>
                <Button component={RouterLink} to="/catalog" variant="outlined" color="primary" fullWidth>
                  Continuar comprando
                </Button>
                <Button variant="text" color="error" onClick={() => void clear()} disabled={items.length === 0} fullWidth>
                  Limpar
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        <Grid container spacing={2.5} alignItems="flex-start">
          <Grid size={{ xs: 12, lg: 7.5 }}>
            <Paper
              component={motion.div}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid rgba(12,22,44,0.08)',
                bgcolor: 'rgba(255,255,255,0.9)',
                overflow: 'hidden',
              }}
            >
              {loading ? (
                <Box
                  component={motion.div}
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  sx={{ p: 3 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Carregando mochila...
                  </Typography>
                </Box>
              ) : items.length === 0 ? (
                <Box
                  component={motion.div}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  sx={{ p: 3 }}
                >
                  <Typography variant="h6" sx={{ color: 'info.main', mb: 0.5 }}>
                    Sua mochila esta vazia
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Adicione produtos no catalogo para iniciar um pedido.
                  </Typography>
                  <Button component={RouterLink} to="/catalog" variant="contained" color="primary">
                    Ir para o catalogo
                  </Button>
                </Box>
              ) : (
                <Stack divider={<Divider sx={{ borderColor: 'rgba(12,22,44,0.07)' }} />}>
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <Box
                        key={item.productId}
                        component={motion.div}
                        layout
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0, x: -16 }}
                        transition={{ duration: 0.22 }}
                        sx={{ p: { xs: 2, md: 2.25 } }}
                      >
                        <Grid container spacing={2} alignItems="center">
                          <Grid size={{ xs: 12, md: 7 }}>
                            <Stack direction="row" spacing={1.4} alignItems="center">
                              <Box
                                component={motion.div}
                                whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
                                transition={{ duration: 0.18 }}
                                sx={{
                                  width: 64,
                                  height: 64,
                                  borderRadius: 2,
                                  border: '1px solid rgba(12,22,44,0.07)',
                                  bgcolor: 'rgba(247,250,248,0.95)',
                                  display: 'grid',
                                  placeItems: 'center',
                                  flexShrink: 0,
                                  overflow: 'hidden',
                                }}
                              >
                                {item.imageUrl ? (
                                  <Box
                                    component="img"
                                    src={item.imageUrl}
                                    alt={item.name}
                                    sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 0.75 }}
                                  />
                                ) : (
                                  <Box sx={{ width: 28, height: 28, borderRadius: '50%', border: '1px dashed rgba(0,39,118,0.2)' }} />
                                )}
                              </Box>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle1" sx={{ color: 'info.main', lineHeight: 1.15 }}>
                                  {item.name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" noWrap>
                                  {item.manufacturer} • {item.bikeModel}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  SKU: {item.sku} • Estoque: {item.stock}
                                </Typography>
                              </Box>
                            </Stack>
                          </Grid>

                          <Grid size={{ xs: 12, md: 2.5 }}>
                            <Stack direction="row" spacing={0.8} alignItems="center">
                              <Button size="small" variant="outlined" onClick={() => void updateQty(item.productId, item.quantity - 1)}>
                                -
                              </Button>
                              <Box
                                component={motion.div}
                                key={`${item.productId}-${item.quantity}`}
                                initial={prefersReducedMotion ? false : { scale: 0.92, opacity: 0.7 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.14 }}
                                sx={{
                                  minWidth: 38,
                                  height: 32,
                                  borderRadius: 1.5,
                                  border: '1px solid rgba(12,22,44,0.08)',
                                  display: 'grid',
                                  placeItems: 'center',
                                  fontSize: '0.9rem',
                                  color: 'rgba(12,22,44,0.9)',
                                }}
                              >
                                {item.quantity}
                              </Box>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={item.quantity >= item.stock}
                                onClick={() => void updateQty(item.productId, item.quantity + 1)}
                              >
                                +
                              </Button>
                            </Stack>
                          </Grid>

                          <Grid size={{ xs: 8, md: 2.5 }}>
                            <Typography variant="subtitle1" sx={{ color: 'info.main', fontWeight: 700 }}>
                              {formatPrice(Number(item.price) * Number(item.quantity))}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatPrice(Number(item.price))} un.
                            </Typography>
                          </Grid>

                          <Grid size={{ xs: 4, md: 12 }}>
                            <Stack direction="row" justifyContent={{ xs: 'flex-end', md: 'flex-start' }}>
                              <Button size="small" color="error" onClick={() => void removeItem(item.productId)}>
                                Remover
                              </Button>
                            </Stack>
                          </Grid>
                        </Grid>
                      </Box>
                    ))}
                  </AnimatePresence>
                </Stack>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 4.5 }}>
            <Paper
              component={motion.div}
              initial={prefersReducedMotion ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.42, ease: 'easeOut', delay: 0.08 }}
              whileHover={prefersReducedMotion ? undefined : { y: -2 }}
              elevation={0}
              sx={{
                p: { xs: 2, md: 2.5 },
                borderRadius: 3,
                border: '1px solid rgba(12,22,44,0.08)',
                bgcolor: 'rgba(255,255,255,0.92)',
                position: { lg: 'sticky' },
                top: { lg: 106 },
              }}
            >
              <Typography variant="h6" sx={{ color: 'info.main', mb: 2 }}>
                Resumo
              </Typography>

              <Stack spacing={1.25}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Itens
                  </Typography>
                  <Typography variant="body2">{itemCount}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Subtotal
                  </Typography>
                  <Typography variant="body2">{formatPrice(total)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Frete
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No checkout
                  </Typography>
                </Stack>
              </Stack>

              <Divider sx={{ my: 2, borderColor: 'rgba(12,22,44,0.08)' }} />

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total
                </Typography>
                <motion.div
                  key={`${total}-${itemCount}`}
                  initial={prefersReducedMotion ? false : { opacity: 0.55, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <Typography variant="h4" sx={{ color: 'info.main', letterSpacing: '-0.03em' }}>
                    {formatPrice(total)}
                  </Typography>
                </motion.div>
              </Stack>

              <motion.div whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}>
                <Button fullWidth variant="contained" color="primary" size="large" disabled={items.length === 0}>
                  {items.length === 0 ? 'Mochila vazia' : 'Ir para checkout'}
                </Button>
              </motion.div>
            </Paper>
          </Grid>
        </Grid>
      </Stack>
    </PublicLayout>
  )
}
