import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
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
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
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
    </Suspense>
  )
}
