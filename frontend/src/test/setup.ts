import '@testing-library/jest-dom/vitest'
import { expect } from 'vitest'
import * as axeMatchers from 'vitest-axe/matchers.js'

expect.extend(axeMatchers)

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
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    })
  }

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

  if (!('IntersectionObserver' in window)) {
    class TestIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }

    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: TestIntersectionObserver,
    })
  }

  if (!('ResizeObserver' in window)) {
    class TestResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      value: TestResizeObserver,
    })
  }

  if (typeof HTMLCanvasElement !== 'undefined') {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => ({
        fillRect() {},
        clearRect() {},
        getImageData: () => ({ data: [] }),
        putImageData() {},
        createImageData: () => [],
        setTransform() {},
        drawImage() {},
        save() {},
        fillText() {},
        restore() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        closePath() {},
        stroke() {},
        translate() {},
        scale() {},
        rotate() {},
        arc() {},
        fill() {},
        measureText: () => ({ width: 0 }),
        transform() {},
        rect() {},
        clip() {},
      }),
    })
  }
}
