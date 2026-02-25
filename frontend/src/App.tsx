import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import CatalogPage from './pages/CatalogPage'
import TechnicalPage from './pages/TechnicalPage'
import CartPage from './pages/CartPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import OwnerGatePage from './pages/OwnerGatePage'
import OwnerDashboardPage from './pages/OwnerDashboardPage'
import OwnerProductsPage from './pages/OwnerProductsPage'
import OwnerProductFormPage from './pages/OwnerProductFormPage'

export default function App() {
  return (
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
  )
}
