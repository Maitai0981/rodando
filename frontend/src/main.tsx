import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './shared/context/AuthContext'
import { CartProvider } from './shared/context/CartContext'
import { AssistProvider } from './shared/context/AssistContext'
import { SiteThemeProvider } from './shared/context/ThemeContext'
import { queryClient } from './shared/lib/queryClient'
import { startWebVitals } from './shared/lib/webVitals'

if (import.meta.env.DEV || String(import.meta.env.VITE_WEB_VITALS || '0') === '1') {
  startWebVitals((sample) => {
    console.info('[web-vitals]', sample.name, sample.value)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SiteThemeProvider>
          <AuthProvider>
            <AssistProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </AssistProvider>
          </AuthProvider>
        </SiteThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
