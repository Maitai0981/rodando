import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material'
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, PropsWithChildren } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { SiteThemeProvider } from '../shared/context/ThemeContext'
import { dsTheme } from '../shared/design-system/theme'

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

export function renderWithProviders(
  ui: ReactElement,
  options?: RenderOptions & { initialEntries?: string[] },
) {
  const queryClient = createTestQueryClient()
  const initialEntries = options?.initialEntries || ['/']

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <ThemeProvider theme={dsTheme}>
        <SiteThemeProvider>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
          </QueryClientProvider>
        </SiteThemeProvider>
      </ThemeProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...(options || {}) })
}
