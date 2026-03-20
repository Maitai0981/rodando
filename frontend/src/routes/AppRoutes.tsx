import { Route, Routes } from 'react-router-dom'
import { lazy } from 'react'
import { OwnerRoute } from './guards/OwnerRoute'
import SiteLayout from '../shared/layout/SiteLayout'

export const routeImporters = {
  home: () => import('../pages/HomePage'),
  catalog: () => import('../pages/CatalogPage'),
  productDetails: () => import('../pages/ProductDetailsPage'),
  cart: () => import('../pages/CartPage'),
  checkout: () => import('../pages/CheckoutPage'),
  signIn: () => import('../pages/SignInPage'),
  signUp: () => import('../pages/SignUpPage'),
  accountProfile: () => import('../pages/AccountProfilePage'),
  orders: () => import('../pages/OrdersPage'),
  orderDetails: () => import('../pages/OrderDetailsPage'),
  ownerSignIn: () => import('../pages/OwnerSignInPage'),
  ownerGate: () => import('../pages/OwnerGatePage'),
  ownerDashboard: () => import('../pages/OwnerDashboardPage'),
  ownerProducts: () => import('../pages/OwnerProductsPage'),
  ownerProductForm: () => import('../pages/OwnerProductFormPage'),
  ownerSettings: () => import('../pages/OwnerSettingsPage'),
  ownerOrders: () => import('../pages/OwnerOrdersPage'),
} as const

const HomePage = lazy(routeImporters.home)
const CatalogPage = lazy(routeImporters.catalog)
const ProductDetailsPage = lazy(routeImporters.productDetails)
const CartPage = lazy(routeImporters.cart)
const CheckoutPage = lazy(routeImporters.checkout)
const SignInPage = lazy(routeImporters.signIn)
const SignUpPage = lazy(routeImporters.signUp)
const AccountProfilePage = lazy(routeImporters.accountProfile)
const OrdersPage = lazy(routeImporters.orders)
const OrderDetailsPage = lazy(routeImporters.orderDetails)
const OwnerSignInPage = lazy(routeImporters.ownerSignIn)
const OwnerGatePage = lazy(routeImporters.ownerGate)
const OwnerDashboardPage = lazy(routeImporters.ownerDashboard)
const OwnerProductsPage = lazy(routeImporters.ownerProducts)
const OwnerProductFormPage = lazy(routeImporters.ownerProductForm)
const OwnerSettingsPage = lazy(routeImporters.ownerSettings)
const OwnerOrdersPage = lazy(routeImporters.ownerOrders)

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/produto/:idSlug" element={<ProductDetailsPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/auth" element={<SignInPage />} />
        <Route path="/auth/signup" element={<SignUpPage />} />
        <Route path="/account/profile" element={<AccountProfilePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailsPage />} />
      </Route>

      <Route path="/owner/login" element={<OwnerSignInPage />} />
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
      <Route
        path="/owner/settings"
        element={
          <OwnerRoute>
            <OwnerSettingsPage />
          </OwnerRoute>
        }
      />
      <Route
        path="/owner/orders"
        element={
          <OwnerRoute>
            <OwnerOrdersPage />
          </OwnerRoute>
        }
      />
    </Routes>
  )
}
