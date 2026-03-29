import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  Loader2,
  Monitor,
  RefreshCw,
  Search,
  Shield,
} from 'lucide-react'
import OwnerLayout from '../shared/layout/OwnerLayout'
import { api, friendlyError, type OwnerAuditLogItem } from '../shared/lib/api'

// ── Helpers ────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  product_create:        { label: 'Produto criado',        color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  product_update:        { label: 'Produto atualizado',    color: 'bg-sky-500/15 text-sky-400 border-sky-500/20' },
  product_delete:        { label: 'Produto removido',      color: 'bg-red-500/15 text-red-400 border-red-500/20' },
  offer_create:          { label: 'Oferta criada',         color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  offer_update:          { label: 'Oferta atualizada',     color: 'bg-sky-500/15 text-sky-400 border-sky-500/20' },
  offer_delete:          { label: 'Oferta removida',       color: 'bg-red-500/15 text-red-400 border-red-500/20' },
  order_status_update:   { label: 'Status do pedido',      color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  return_create:         { label: 'Devolução registrada',  color: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
  return_update:         { label: 'Devolução atualizada',  color: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
  complaint_create:      { label: 'Reclamação aberta',     color: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
  complaint_update:      { label: 'Reclamação atualizada', color: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
  owner_settings_update: { label: 'Configurações',         color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20' },
  staff_create:          { label: 'Funcionário criado',    color: 'bg-teal-500/15 text-teal-400 border-teal-500/20' },
  staff_update:          { label: 'Funcionário atualizado',color: 'bg-teal-500/15 text-teal-400 border-teal-500/20' },
  staff_password_reset:  { label: 'Senha redefinida',      color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
}

function actionCfg(type: string) {
  return ACTION_LABELS[type] ?? { label: type, color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20' }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function shortUA(ua: string | null) {
  if (!ua) return '—'
  // Extrai apenas o nome do browser principal
  const match = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/)
  return match ? match[0] : ua.slice(0, 40)
}

// ── Row expandable ──────────────────────────────────────────────────────────

function AuditRow({ log }: { log: OwnerAuditLogItem }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = actionCfg(log.actionType)
  const hasDiff = Object.keys(log.before).length > 0 || Object.keys(log.after).length > 0

  return (
    <>
      <tr
        className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${hasDiff ? 'cursor-pointer' : ''}`}
        onClick={() => hasDiff && setExpanded((v) => !v)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#d4a843]/15 border border-[#d4a843]/25 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-[#d4a843]">
              {initials(log.ownerName)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#e5e7eb] truncate leading-tight">{log.ownerName}</p>
              <p className="text-[10px] text-[#6b7280] truncate leading-tight">{log.ownerEmail}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.color}`}>
            {cfg.label}
          </span>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          {log.ipAddress ? (
            <span className="flex items-center gap-1 text-xs text-[#9ca3af]">
              <Globe className="w-3 h-3 flex-shrink-0 text-[#6b7280]" />
              {log.ipAddress}
            </span>
          ) : <span className="text-xs text-[#374151]">—</span>}
        </td>
        <td className="px-4 py-3 hidden lg:table-cell">
          <span className="flex items-center gap-1 text-[10px] text-[#6b7280]" title={log.userAgent ?? ''}>
            <Monitor className="w-3 h-3 flex-shrink-0" />
            {shortUA(log.userAgent)}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="flex items-center gap-1 text-xs text-[#6b7280] whitespace-nowrap">
            <Clock className="w-3 h-3 flex-shrink-0" />
            {formatDate(log.createdAt)}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          {hasDiff ? (
            expanded
              ? <ChevronUp className="w-3.5 h-3.5 text-[#6b7280] ml-auto" />
              : <ChevronDown className="w-3.5 h-3.5 text-[#6b7280] ml-auto" />
          ) : null}
        </td>
      </tr>
      {expanded && hasDiff ? (
        <tr className="border-b border-white/[0.04] bg-white/[0.02]">
          <td colSpan={6} className="px-4 pb-3 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {Object.keys(log.before).length > 0 ? (
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-[#6b7280] mb-1.5">Antes</p>
                  <pre className="text-[11px] text-[#9ca3af] bg-white/[0.03] rounded-lg p-3 overflow-x-auto border border-white/[0.06]">
                    {JSON.stringify(log.before, null, 2)}
                  </pre>
                </div>
              ) : null}
              {Object.keys(log.after).length > 0 ? (
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-[#6b7280] mb-1.5">Depois</p>
                  <pre className="text-[11px] text-emerald-400/80 bg-white/[0.03] rounded-lg p-3 overflow-x-auto border border-white/[0.06]">
                    {JSON.stringify(log.after, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function OwnerAuditPage() {
  const [logs, setLogs] = useState<OwnerAuditLogItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const mountedRef = useRef(true)

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { items } = await api.listOwnerAuditLogs(300)
      if (mountedRef.current) setLogs(items)
    } catch (err) {
      if (mountedRef.current) setError(friendlyError(err, 'Falha ao carregar logs.'))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // Usuários únicos para filtro
  const uniqueUsers = Array.from(
    new Map(logs.map((l) => [l.ownerUserId, l.ownerName])).entries()
  ).map(([id, name]) => ({ id, name }))

  const uniqueActions = Array.from(new Set(logs.map((l) => l.actionType)))

  const filtered = logs.filter((log) => {
    if (filterUser && String(log.ownerUserId) !== filterUser) return false
    if (filterAction && log.actionType !== filterAction) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        log.ownerName.toLowerCase().includes(q) ||
        log.ownerEmail.toLowerCase().includes(q) ||
        log.actionType.toLowerCase().includes(q) ||
        (log.ipAddress ?? '').includes(q) ||
        log.entityType.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <OwnerLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#f0ede8] flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#d4a843]" />
              Trilha de auditoria
            </h1>
            <p className="mt-0.5 text-xs text-[#6b7280]">
              Histórico de ações realizadas por funcionários no painel — com IP e dispositivo.
            </p>
          </div>
          <button onClick={() => void load()} disabled={loading}
            className="flex items-center gap-2 h-9 px-3 rounded-lg text-xs border border-white/[0.1] text-[#9ca3af] hover:text-[#f0ede8] hover:border-white/[0.2] transition-colors disabled:opacity-50 self-start">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {error ? (
          <div className="p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/20 text-[#f87171]">{error}</div>
        ) : null}

        {/* Filtros */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07] flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6b7280]" />
            <input
              type="text"
              placeholder="Buscar por nome, IP, ação..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8] placeholder:text-[#4b5563]"
            />
          </div>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            aria-label="Filtrar por funcionário"
            className="h-9 px-2.5 rounded-lg text-xs outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
          >
            <option value="" className="bg-[#111118]">Todos os funcionários</option>
            {uniqueUsers.map((u) => (
              <option key={u.id} value={String(u.id)} className="bg-[#111118]">{u.name}</option>
            ))}
          </select>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            aria-label="Filtrar por ação"
            className="h-9 px-2.5 rounded-lg text-xs outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
          >
            <option value="" className="bg-[#111118]">Todas as ações</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a} className="bg-[#111118]">{actionCfg(a).label}</option>
            ))}
          </select>
        </div>

        {/* Tabela */}
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-[#6b7280] text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="w-8 h-8 text-[#374151] mb-3" />
            <p className="text-sm text-[#6b7280]">
              {logs.length === 0 ? 'Nenhuma ação registrada ainda.' : 'Nenhum resultado para os filtros aplicados.'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden border border-white/[0.07]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-[#6b7280] font-medium">Funcionário</th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-[#6b7280] font-medium">Ação</th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-[#6b7280] font-medium hidden sm:table-cell">IP</th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-[#6b7280] font-medium hidden lg:table-cell">Dispositivo</th>
                    <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-[#6b7280] font-medium">Data/hora</th>
                    <th className="px-4 py-3 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log) => (
                    <AuditRow key={log.id} log={log} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 bg-white/[0.02] border-t border-white/[0.06]">
              <p className="text-[10px] text-[#4b5563]">
                {filtered.length} de {logs.length} registros
              </p>
            </div>
          </div>
        )}
      </div>
    </OwnerLayout>
  )
}
