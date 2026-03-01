import '@testing-library/jest-dom/vitest'

type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
  clear: () => void
}

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => {
      map.set(String(key), String(value))
    },
    removeItem: (key) => {
      map.delete(String(key))
    },
    clear: () => {
      map.clear()
    },
  }
}

if (typeof window !== 'undefined') {
  const storage = (window as unknown as { localStorage?: Partial<StorageLike> }).localStorage
  const hasStorageApi = Boolean(
    storage &&
      typeof storage.getItem === 'function' &&
      typeof storage.setItem === 'function' &&
      typeof storage.removeItem === 'function' &&
      typeof storage.clear === 'function',
  )

  if (!hasStorageApi) {
    const fallbackStorage = createMemoryStorage()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: fallbackStorage,
    })
  }
}
