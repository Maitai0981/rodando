import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { AssistProvider } from './context/AssistContext'
import { dsTheme } from './design-system/theme'
import { queryClient } from './lib/queryClient'
import { startWebVitals } from './lib/webVitals'

if (import.meta.env.DEV || String(import.meta.env.VITE_WEB_VITALS || '0') === '1') {
  startWebVitals((sample) => {
    console.info('[web-vitals]', sample.name, sample.value)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={dsTheme}>
        <CssBaseline />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <AssistProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </AssistProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
