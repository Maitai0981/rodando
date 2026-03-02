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
import { theme } from './theme'
import { queryClient } from './lib/queryClient'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
<<<<<<< HEAD
        <BrowserRouter>
=======
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
>>>>>>> 00d9f8b1cd49468b71d5f26d93d4a98448814a55
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
