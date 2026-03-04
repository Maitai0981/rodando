type VitalSample = {
  name: 'LCP' | 'CLS' | 'INP'
  value: number
}

export function startWebVitals(onSample: (sample: VitalSample) => void) {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return () => {}
  }

  let clsValue = 0
  let lcpValue = 0
  let inpValue = 0
  const observers: PerformanceObserver[] = []

  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const last = entries[entries.length - 1]
      if (!last) return
      lcpValue = Number(last.startTime.toFixed(2))
      onSample({ name: 'LCP', value: lcpValue })
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
    observers.push(lcpObserver)
  } catch {
    // no-op
  }

  try {
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const layoutShift = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number }
        if (layoutShift.hadRecentInput) continue
        clsValue += Number(layoutShift.value || 0)
      }
      onSample({ name: 'CLS', value: Number(clsValue.toFixed(4)) })
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })
    observers.push(clsObserver)
  } catch {
    // no-op
  }

  try {
    const inpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const eventTiming = entry as PerformanceEntry & { duration?: number }
        inpValue = Math.max(inpValue, Number(eventTiming.duration || 0))
      }
      if (inpValue > 0) {
        onSample({ name: 'INP', value: Number(inpValue.toFixed(2)) })
      }
    })
    inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 40 } as PerformanceObserverInit)
    observers.push(inpObserver)
  } catch {
    // no-op
  }

  const onHidden = () => {
    if (document.visibilityState !== 'hidden') return
    if (lcpValue > 0) onSample({ name: 'LCP', value: lcpValue })
    onSample({ name: 'CLS', value: Number(clsValue.toFixed(4)) })
    if (inpValue > 0) onSample({ name: 'INP', value: Number(inpValue.toFixed(2)) })
  }
  document.addEventListener('visibilitychange', onHidden)

  return () => {
    document.removeEventListener('visibilitychange', onHidden)
    for (const observer of observers) {
      observer.disconnect()
    }
  }
}
