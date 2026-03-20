import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          return false
        }
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
})
