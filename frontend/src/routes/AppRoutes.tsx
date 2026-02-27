import { Route, Routes } from 'react-router-dom'
import { lazy } from 'react'
import { OwnerRoute } from './guards/OwnerRoute'

const HomePage = lazy(() => import('../pages/HomePage'))
const CatalogPage = lazy(() => import('../pages/CatalogPage'))
const CartPage = lazy(() => import('../pages/CartPage'))
const SignInPage = lazy(() => import('../pages/SignInPage'))
const SignUpPage = lazy(() => import('../pages/SignUpPage'))
const OwnerGatePage = lazy(() => import('../pages/OwnerGatePage'))
const OwnerDashboardPage = lazy(() => import('../pages/OwnerDashboardPage'))
const OwnerProductsPage = lazy(() => import('../pages/OwnerProductsPage'))
const OwnerProductFormPage = lazy(() => import('../pages/OwnerProductFormPage'))

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/catalog" element={<CatalogPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/auth" element={<SignInPage />} />
      <Route path="/auth/signup" element={<SignUpPage />} />
      <Route path="/owner" element={<OwnerGatePage />} />

      <Route
        path="/owner/dashboard"
        element={
          <OwnerRoute>
            <OwnerDashboardPage />
          </OwnerRoute>
        }
      />
      <Route
        path="/owner/products"
        element={
          <OwnerRoute>
            <OwnerProductsPage />
          </OwnerRoute>
        }
      />
      <Route
        path="/owner/products/new"
        element={
          <OwnerRoute>
            <OwnerProductFormPage />
          </OwnerRoute>
        }
      />
      <Route
        path="/owner/products/:id/edit"
        element={
          <OwnerRoute>
            <OwnerProductFormPage />
          </OwnerRoute>
        }
      />
    </Routes>
  )
}
