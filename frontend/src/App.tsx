import { Suspense, lazy } from 'react'
import { Box } from '@mui/material'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Route, Routes, useLocation } from 'react-router-dom'
import RouteFallback from './components/common/RouteFallback'

const HomePage = lazy(() => import('./pages/HomePage'))
const CatalogPage = lazy(() => import('./pages/CatalogPage'))
const TechnicalPage = lazy(() => import('./pages/TechnicalPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const SignInPage = lazy(() => import('./pages/SignInPage'))
const SignUpPage = lazy(() => import('./pages/SignUpPage'))
const OwnerGatePage = lazy(() => import('./pages/OwnerGatePage'))
const OwnerDashboardPage = lazy(() => import('./pages/OwnerDashboardPage'))
const OwnerProductsPage = lazy(() => import('./pages/OwnerProductsPage'))
const OwnerProductFormPage = lazy(() => import('./pages/OwnerProductFormPage'))

export default function App() {
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  return (
    <Suspense fallback={<RouteFallback />}>
      <Box sx={{ width: '100%', minHeight: '100vh', overflowX: 'clip', position: 'relative' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={reduceMotion ? false : { opacity: 0, x: 34 }}
            animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -34 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: '100%', minHeight: '100vh', position: 'relative' }}
          >
            <Routes location={location}>
              <Route path="/" element={<HomePage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/technical" element={<TechnicalPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/auth" element={<SignInPage />} />
              <Route path="/auth/signup" element={<SignUpPage />} />
              <Route path="/owner" element={<OwnerGatePage />} />
              <Route path="/owner/dashboard" element={<OwnerDashboardPage />} />
              <Route path="/owner/products" element={<OwnerProductsPage />} />
              <Route path="/owner/products/new" element={<OwnerProductFormPage />} />
              <Route path="/owner/products/:id/edit" element={<OwnerProductFormPage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </Box>
    </Suspense>
  )
}
