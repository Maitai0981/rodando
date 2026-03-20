import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'

export type SiteTheme = 'dark' | 'light'

type ThemeContextValue = {
  theme: SiteTheme
  isLightTheme: boolean
  setTheme: (theme: SiteTheme) => void
  toggleTheme: () => void
}

const STORAGE_KEY = 'rodando-site-theme'
const DEFAULT_THEME: SiteTheme = 'dark'

const ThemeContext = createContext<ThemeContextValue | null>(null)

function resolveInitialTheme(): SiteTheme {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME
  }
  const storedTheme = window.localStorage.getItem(STORAGE_KEY)
  return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : DEFAULT_THEME
}

export function SiteThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<SiteTheme>(resolveInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-site-theme', theme)
    root.style.colorScheme = theme
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isLightTheme: theme === 'light',
      setTheme,
      toggleTheme,
    }),
    [theme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useSiteTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useSiteTheme must be used within SiteThemeProvider')
  }
  return context
}
