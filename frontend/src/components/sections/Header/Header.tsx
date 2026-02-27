import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import AppBar from '@mui/material/AppBar'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import type { ChangeEvent, FormEvent } from 'react'
import { useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { useCart } from '../../../context/CartContext'
import {
  UiBadge,
  UiChip,
  UiContainer,
  UiDrawer,
  UiInput,
} from '../../ui'

const NAV_LINKS = [
  { label: 'Inicio', href: '/' },
  { label: 'Catalogo', href: '/catalog' },
  { label: 'Medidas', href: '/technical' },
]

const CATEGORY_LINKS = [
  'Camaras de ar',
  'Pneus',
  'Relacao',
  'Freios',
  'Transmissao',
  'Acessorios',
]

const SEARCH_SUGGESTIONS = [
  'Camera 300-17',
  'Pneu 90/90-19',
  'Kit corrente',
  'Pastilha de freio',
  'Relacao 428',
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { itemCount } = useCart()
  const { status, logout, user } = useAuth()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchValue, setSearchValue] = useState<string | null>(null)
  const [searchInputValue, setSearchInputValue] = useState('')

  async function handleLogout() {
    await logout()
    navigate('/', { replace: true })
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = (searchInputValue || searchValue || '').trim()
    navigate(`/catalog${query ? `?q=${encodeURIComponent(query)}` : ''}`)
  }

  const accountLabel = status === 'authenticated' ? user?.name || 'Conta' : 'Entrar'
  const accountHref = status === 'authenticated' && user?.role === 'owner' ? '/owner/dashboard' : '/auth'

  return (
    <>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <UiContainer fluid>
          <Toolbar disableGutters sx={{ minHeight: { xs: 64, md: 78 }, gap: { xs: 1, md: 2 } }}>
            <IconButton
              aria-label="Abrir categorias"
              edge="start"
              onClick={() => setDrawerOpen(true)}
              sx={{ display: { xs: 'inline-flex', md: 'none' } }}
            >
              <MenuRoundedIcon />
            </IconButton>

            <Stack
              component={RouterLink}
              to="/"
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ minWidth: 0 }}
            >
              <Box
                sx={{
                  width: { xs: 36, md: 40 },
                  height: { xs: 36, md: 40 },
                  borderRadius: '50%',
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  fontSize: { xs: 14, md: 16 },
                }}
              >
                R
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ lineHeight: 1, fontWeight: 700 }}>
                  RODANDO
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                  Moto Center
                </Typography>
              </Box>
            </Stack>

            <Box component="form" onSubmit={handleSearchSubmit} sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }}>
              <Autocomplete
                freeSolo
                options={SEARCH_SUGGESTIONS}
                value={searchValue}
                inputValue={searchInputValue}
                onChange={(_, value) => setSearchValue(value)}
                onInputChange={(_, value) => setSearchInputValue(value)}
                renderInput={(params) => (
                  <UiInput
                    {...params}
                    size="small"
                    placeholder="Buscar por produto, medida ou marca"
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <SearchRoundedIcon color="action" sx={{ mr: 1 }} />,
                    }}
                  />
                )}
              />
            </Box>

            <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
              {NAV_LINKS.map((link) => (
                <Button
                  key={link.href}
                  component={RouterLink}
                  to={link.href}
                  color={isActive(location.pathname, link.href) ? 'primary' : 'inherit'}
                  variant={isActive(location.pathname, link.href) ? 'contained' : 'text'}
                  sx={{ minHeight: 40, px: 1.7 }}
                >
                  {link.label}
                </Button>
              ))}
            </Stack>

            <Stack direction="row" spacing={0.5} alignItems="center">
              <IconButton aria-label="Abrir carrinho" component={RouterLink} to="/cart">
                <UiBadge badgeContent={itemCount} color="secondary" max={99}>
                  <ShoppingBagOutlinedIcon />
                </UiBadge>
              </IconButton>
              <Button
                component={RouterLink}
                to={accountHref}
                variant="outlined"
                startIcon={<PersonOutlineRoundedIcon />}
                sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
              >
                {accountLabel}
              </Button>
              {status === 'authenticated' ? (
                <Button
                  variant="text"
                  color="inherit"
                  onClick={() => {
                    void handleLogout()
                  }}
                  sx={{ display: { xs: 'none', lg: 'inline-flex' } }}
                >
                  Sair
                </Button>
              ) : null}
            </Stack>
          </Toolbar>

          <Box sx={{ display: { xs: 'block', md: 'none' }, pb: 1.5 }}>
            <Box component="form" onSubmit={handleSearchSubmit}>
              <UiInput
                size="small"
                placeholder="Buscar produto ou medida"
                value={searchInputValue}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchInputValue(event.target.value)}
                InputProps={{
                  startAdornment: <SearchRoundedIcon color="action" sx={{ mr: 1 }} />,
                }}
              />
            </Box>
          </Box>
        </UiContainer>
      </AppBar>

      <UiDrawer
        anchor="left"
        open={drawerOpen}
        onClose={(_, reason) => {
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            setDrawerOpen(false)
          }
        }}
        headerTitle="Categorias"
        footer={<Button fullWidth variant="contained" component={RouterLink} to="/catalog">Ver catalogo</Button>}
      >
        <List sx={{ p: 0 }}>
          {NAV_LINKS.map((link) => (
            <ListItem disablePadding key={`mobile-${link.href}`}>
              <ListItemButton
                component={RouterLink}
                to={link.href}
                onClick={() => setDrawerOpen(false)}
              >
                <Typography variant="body2">{link.label}</Typography>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          {CATEGORY_LINKS.map((category) => (
            <UiChip key={category} label={category} emphasis="soft" />
          ))}
        </Stack>
      </UiDrawer>
    </>
  )
}
