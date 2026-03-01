import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useLocation } from 'react-router-dom'
import type { AssistChecklistState } from '../lib/api'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'
import { getAssistRouteByKey, resolveAssistRoute } from '../assist/assistSchema'
import type { AssistRouteDefinition, AssistRouteKey } from '../assist/assistSchema'

type AssistRouteState = {
  checklistState: AssistChecklistState
  dismissedTips: string[]
  overlaySeen: boolean
  updatedAt: string | null
}

type AssistStateMap = Record<string, AssistRouteState>

type AssistContextValue = {
  enabled: boolean
  activeRoute: AssistRouteDefinition | null
  activeRouteState: AssistRouteState
  checklistOpen: boolean
  setChecklistOpen: (open: boolean) => void
  completeStep: (stepId: string, routeKey?: AssistRouteKey | string) => void
  dismissTip: (tipId: string, routeKey?: AssistRouteKey | string) => void
  markOverlaySeen: (routeKey?: AssistRouteKey | string) => void
  isStepCompleted: (stepId: string, routeKey?: AssistRouteKey | string) => boolean
  resetAssist: () => Promise<void>
  trackAssistEvent: (eventName: string, payload?: Record<string, unknown>) => void
}

const ASSIST_LOCAL_STATE_KEY = 'rodando.assist.local.v1'
const ASSIST_UI_STATE_KEY = 'rodando.assist.ui.v1'
const ASSIST_ROLLOUT_KEY = 'rodando.assist.rollout.v1'
const EMPTY_ROUTE_STATE: AssistRouteState = {
  checklistState: {},
  dismissedTips: [],
  overlaySeen: false,
  updatedAt: null,
}

const AssistContext = createContext<AssistContextValue>({
  enabled: false,
  activeRoute: null,
  activeRouteState: EMPTY_ROUTE_STATE,
  checklistOpen: true,
  setChecklistOpen: () => {},
  completeStep: () => {},
  dismissTip: () => {},
  markOverlaySeen: () => {},
  isStepCompleted: () => false,
  resetAssist: async () => {},
  trackAssistEvent: () => {},
})

function readLocalState(): AssistStateMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(ASSIST_LOCAL_STATE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed as AssistStateMap
  } catch {
    return {}
  }
}

function writeLocalState(next: AssistStateMap) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ASSIST_LOCAL_STATE_KEY, JSON.stringify(next))
  } catch {
    // noop
  }
}

function clearLocalState() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(ASSIST_LOCAL_STATE_KEY)
  } catch {
    // noop
  }
}

function readChecklistOpen() {
  if (typeof window === 'undefined') return true
  try {
    const raw = window.localStorage.getItem(ASSIST_UI_STATE_KEY)
    if (!raw) return true
    const parsed = JSON.parse(raw)
    return parsed?.checklistOpen !== false
  } catch {
    return true
  }
}

function writeChecklistOpen(open: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(ASSIST_UI_STATE_KEY, JSON.stringify({ checklistOpen: open }))
  } catch {
    // noop
  }
}

function sanitizeRouteState(value: unknown): AssistRouteState {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

  const checklistState = source.checklistState && typeof source.checklistState === 'object' && !Array.isArray(source.checklistState)
    ? Object.fromEntries(
      Object.entries(source.checklistState as Record<string, unknown>).map(([key, val]) => [key, Boolean(val)]),
    )
    : {}

  const dismissedTips = Array.isArray(source.dismissedTips)
    ? Array.from(
      new Set(
        source.dismissedTips
          .map((item) => String(item || '').trim())
          .filter(Boolean),
      ),
    )
    : []

  return {
    checklistState,
    dismissedTips,
    overlaySeen: Boolean(source.overlaySeen),
    updatedAt: source.updatedAt ? String(source.updatedAt) : null,
  }
}

function mergeRouteStates(base: AssistRouteState, patch: AssistRouteState): AssistRouteState {
  return {
    checklistState: { ...base.checklistState, ...patch.checklistState },
    dismissedTips: Array.from(new Set([...base.dismissedTips, ...patch.dismissedTips])),
    overlaySeen: Boolean(base.overlaySeen || patch.overlaySeen),
    updatedAt: patch.updatedAt || base.updatedAt || null,
  }
}

function normalizeStateMap(raw: AssistStateMap): AssistStateMap {
  const normalized: AssistStateMap = {}
  for (const [routeKey, value] of Object.entries(raw || {})) {
    const route = getAssistRouteByKey(routeKey)
    if (!route) continue
    normalized[routeKey] = sanitizeRouteState(value)
  }
  return normalized
}

function mapServerItemsToState(items: Array<Record<string, unknown>>): AssistStateMap {
  const mapped: AssistStateMap = {}
  for (const item of items) {
    const routeKey = String(item.routeKey || '').trim()
    if (!getAssistRouteByKey(routeKey)) continue
    mapped[routeKey] = sanitizeRouteState({
      checklistState: item.checklistState,
      dismissedTips: item.dismissedTips,
      overlaySeen: item.overlaySeen,
      updatedAt: item.updatedAt,
    })
  }
  return mapped
}

function mergeStateMaps(serverState: AssistStateMap, localState: AssistStateMap): AssistStateMap {
  const merged: AssistStateMap = { ...serverState }
  for (const [routeKey, localRouteState] of Object.entries(localState)) {
    const base = merged[routeKey] ?? EMPTY_ROUTE_STATE
    merged[routeKey] = mergeRouteStates(base, sanitizeRouteState(localRouteState))
  }
  return merged
}

function resolveRolloutBucket(userId: number | null): number {
  if (Number.isInteger(userId) && Number(userId) > 0) {
    return Number(userId) % 100
  }

  if (typeof window === 'undefined') return 0
  const existing = Number(window.localStorage.getItem(ASSIST_ROLLOUT_KEY) || '')
  if (Number.isInteger(existing) && existing >= 0 && existing <= 99) {
    return existing
  }

  const generated = Math.floor(Math.random() * 100)
  window.localStorage.setItem(ASSIST_ROLLOUT_KEY, String(generated))
  return generated
}

export function AssistProvider({ children }: PropsWithChildren) {
  const location = useLocation()
  const { status, user } = useAuth()
  const [states, setStates] = useState<AssistStateMap>({})
  const [checklistOpen, setChecklistOpenState] = useState<boolean>(() => readChecklistOpen())

  const envEnabled = String(import.meta.env.VITE_ASSIST_ENABLED ?? '1') !== '0'
  const rolloutPercent = Math.max(0, Math.min(100, Number(import.meta.env.VITE_ASSIST_ROLLOUT_PERCENT ?? 25)))
  const rolloutBucket = useMemo(() => resolveRolloutBucket(user?.id ?? null), [user?.id])
  const enabled = envEnabled && rolloutBucket < rolloutPercent
  const authenticated = status === 'authenticated' && Boolean(user?.id)
  const activeRoute = useMemo(() => resolveAssistRoute(location.pathname), [location.pathname])

  const trackAssistEvent = useCallback((eventName: string, payload: Record<string, unknown> = {}) => {
    if (!enabled) return
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('assist:telemetry', {
          detail: {
            eventName,
            routeKey: activeRoute?.key || null,
            timestamp: new Date().toISOString(),
            ...payload,
          },
        }),
      )
    }
  }, [enabled, activeRoute?.key])

  const syncRouteToServer = useCallback(async (routeKey: string, nextState: AssistRouteState) => {
    const route = getAssistRouteByKey(routeKey)
    if (!route || !authenticated) return
    try {
      await api.updateAssistState({
        scope: route.scope,
        routeKey: route.key,
        checklistState: nextState.checklistState,
        dismissedTips: nextState.dismissedTips,
        overlaySeen: nextState.overlaySeen,
      })
    } catch {
      // fallback silencioso para nao bloquear UX
    }
  }, [authenticated])

  useEffect(() => {
    writeChecklistOpen(checklistOpen)
  }, [checklistOpen])

  const setChecklistOpen = useCallback((open: boolean) => {
    setChecklistOpenState(open)
  }, [])

  useEffect(() => {
    if (!enabled) {
      setStates({})
      return
    }

    let cancelled = false
    if (!authenticated) {
      setStates(normalizeStateMap(readLocalState()))
      return () => {
        cancelled = true
      }
    }

    void (async () => {
      try {
        const [publicState, ownerState] = await Promise.all([
          api.getAssistState('public'),
          api.getAssistState('owner'),
        ])
        if (cancelled) return

        const serverMap = mapServerItemsToState([...(publicState.items || []), ...(ownerState.items || [])])
        const localMap = normalizeStateMap(readLocalState())
        const merged = mergeStateMaps(serverMap, localMap)
        setStates(merged)

        const localEntries = Object.entries(localMap)
        if (localEntries.length > 0) {
          await Promise.all(
            localEntries.map(async ([routeKey, routeState]) => {
              await syncRouteToServer(routeKey, routeState)
            }),
          )
          clearLocalState()
        }
      } catch {
        if (!cancelled) {
          setStates(normalizeStateMap(readLocalState()))
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [authenticated, enabled, syncRouteToServer])

  const persistRouteState = useCallback(
    (routeKey: string, updater: (current: AssistRouteState) => AssistRouteState) => {
      setStates((previous) => {
        const current = previous[routeKey] ? sanitizeRouteState(previous[routeKey]) : EMPTY_ROUTE_STATE
        const next = sanitizeRouteState(updater(current))
        const nextMap = { ...previous, [routeKey]: next }
        if (!authenticated) {
          writeLocalState(nextMap)
        } else {
          void syncRouteToServer(routeKey, next)
        }
        return nextMap
      })
    },
    [authenticated, syncRouteToServer],
  )

  const completeStep = useCallback((stepId: string, routeKey?: AssistRouteKey | string) => {
    const key = String(routeKey || activeRoute?.key || '').trim()
    if (!key || !stepId) return

    const route = getAssistRouteByKey(key)
    if (!route || !route.checklist.some((step) => step.id === stepId)) return

    persistRouteState(key, (current) => ({
      ...current,
      checklistState: { ...current.checklistState, [stepId]: true },
      updatedAt: new Date().toISOString(),
    }))
    trackAssistEvent('assist_step_completed', { routeKey: key, stepId })

    const routeCompleted = route.checklist.every((step) => {
      if (step.id === stepId) return true
      return Boolean(states[key]?.checklistState?.[step.id])
    })
    if (routeCompleted) {
      trackAssistEvent('assist_checklist_finished', { routeKey: key })
    }
  }, [activeRoute?.key, persistRouteState, states, trackAssistEvent])

  const dismissTip = useCallback((tipId: string, routeKey?: AssistRouteKey | string) => {
    const key = String(routeKey || activeRoute?.key || '').trim()
    if (!key || !tipId) return
    persistRouteState(key, (current) => ({
      ...current,
      dismissedTips: Array.from(new Set([...current.dismissedTips, tipId])),
      updatedAt: new Date().toISOString(),
    }))
  }, [activeRoute?.key, persistRouteState])

  const markOverlaySeen = useCallback((routeKey?: AssistRouteKey | string) => {
    const key = String(routeKey || activeRoute?.key || '').trim()
    if (!key) return
    persistRouteState(key, (current) => ({
      ...current,
      overlaySeen: true,
      updatedAt: new Date().toISOString(),
    }))
    trackAssistEvent('assist_overlay_seen', { routeKey: key })
  }, [activeRoute?.key, persistRouteState, trackAssistEvent])

  const isStepCompleted = useCallback((stepId: string, routeKey?: AssistRouteKey | string) => {
    const key = String(routeKey || activeRoute?.key || '').trim()
    if (!key || !stepId) return false
    return Boolean(states[key]?.checklistState?.[stepId])
  }, [activeRoute?.key, states])

  const resetAssist = useCallback(async () => {
    if (authenticated) {
      await api.resetAssistState()
      setStates({})
    } else {
      clearLocalState()
      setStates({})
    }
  }, [authenticated])

  const activeRouteState = activeRoute ? sanitizeRouteState(states[activeRoute.key] || EMPTY_ROUTE_STATE) : EMPTY_ROUTE_STATE

  const value = useMemo<AssistContextValue>(() => ({
    enabled,
    activeRoute,
    activeRouteState,
    checklistOpen,
    setChecklistOpen,
    completeStep,
    dismissTip,
    markOverlaySeen,
    isStepCompleted,
    resetAssist,
    trackAssistEvent,
  }), [
    enabled,
    activeRoute,
    activeRouteState,
    checklistOpen,
    setChecklistOpen,
    completeStep,
    dismissTip,
    markOverlaySeen,
    isStepCompleted,
    resetAssist,
    trackAssistEvent,
  ])

  return <AssistContext.Provider value={value}>{children}</AssistContext.Provider>
}

export function useAssist() {
  return useContext(AssistContext)
}
