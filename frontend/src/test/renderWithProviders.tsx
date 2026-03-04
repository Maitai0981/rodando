import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, PropsWithChildren } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { dsTheme } from '../design-system/theme'

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const queryClient = createTestQueryClient()

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <ThemeProvider theme={dsTheme}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>{children}</MemoryRouter>
        </QueryClientProvider>
      </ThemeProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}
