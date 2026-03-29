import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, Loader2 } from 'lucide-react'
import OwnerLayout from '../shared/layout/OwnerLayout'
import { api, ApiError, type OwnerSettings } from '../shared/lib/api'
import { useAssist } from '../shared/context/AssistContext'

function toDraft(item: OwnerSettings): OwnerSettings {
  return { ...item }
}

type FieldDef = { key: keyof OwnerSettings; label: string; type?: 'number' | 'checkbox'; cols?: number }

const SETTING_SECTIONS: { title: string; description: string; fields: FieldDef[] }[] = [
  {
    title: 'Alertas e contatos',
    description: 'Configure onde as notificações de venda serão enviadas.',
    fields: [
      { key: 'salesAlertEmail',    label: 'E-mail de alerta de venda' },
      { key: 'salesAlertWhatsapp', label: 'WhatsApp (opcional)'       },
    ],
  },
  {
    title: 'Dados da loja',
    description: 'Informações institucionais e fiscais do estabelecimento.',
    fields: [
      { key: 'storeName', label: 'Nome da loja' },
      { key: 'storeCnpj', label: 'CNPJ'         },
      { key: 'storeIe',   label: 'Inscrição estadual' },
      { key: 'taxProfile', label: 'Perfil tributário'  },
    ],
  },
  {
    title: 'Endereço',
    description: 'Endereço físico da loja exibido no site.',
    fields: [
      { key: 'storeAddressStreet',     label: 'Logradouro',   cols: 2 },
      { key: 'storeAddressNumber',     label: 'Número'                },
      { key: 'storeAddressComplement', label: 'Complemento'           },
      { key: 'storeAddressDistrict',   label: 'Bairro'                },
      { key: 'storeAddressCity',       label: 'Cidade'                },
      { key: 'storeAddressState',      label: 'UF'                    },
      { key: 'storeAddressCep',        label: 'CEP'                   },
    ],
  },
  {
    title: 'Localização',
    description: 'Coordenadas para exibição no mapa.',
    fields: [
      { key: 'storeLat', label: 'Latitude',  type: 'number' },
      { key: 'storeLng', label: 'Longitude', type: 'number' },
    ],
  },
  {
    title: 'Custos operacionais',
    description: 'Parâmetros usados no cálculo de margem e frete.',
    fields: [
      { key: 'freeShippingGlobalMin', label: 'Mínimo para frete grátis (R$)',  type: 'number' },
      { key: 'taxPercent',            label: 'Impostos (%)',                   type: 'number' },
      { key: 'gatewayFeePercent',     label: 'Taxa gateway (%)',               type: 'number' },
      { key: 'gatewayFixedFee',       label: 'Taxa fixa gateway (R$)',         type: 'number' },
      { key: 'operationalPercent',    label: 'Custo operacional (%)',          type: 'number' },
      { key: 'packagingCost',         label: 'Custo de embalagem (R$)',        type: 'number' },
      { key: 'blockBelowMinimum',     label: 'Bloquear venda abaixo do mínimo de estoque', type: 'checkbox', cols: 3 },
    ],
  },
]

/* ── Campo reutilizável ─────────────────────────────────────── */
function SettingsField({
  field,
  draft,
  onChange,
}: {
  field: FieldDef
  draft: OwnerSettings
  onChange: (key: keyof OwnerSettings, value: string | number | boolean) => void
}) {
  const id = `owner-settings-${field.key}`
  const value = draft[field.key]
  const colSpan = field.cols === 3 ? 'md:col-span-3' : field.cols === 2 ? 'md:col-span-2' : ''

  if (field.type === 'checkbox') {
    return (
      <div className={`${colSpan} flex items-center gap-3 pt-1`}>
        <input
          id={id}
          type="checkbox"
          className="w-4 h-4 accent-[#d4a843] flex-shrink-0"
          checked={Boolean(value)}
          onChange={(e) => onChange(field.key, e.target.checked)}
        />
        <label htmlFor={id} className="text-sm text-[#f0ede8] cursor-pointer select-none">
          {field.label}
        </label>
      </div>
    )
  }

  return (
    <div className={colSpan}>
      <label htmlFor={id} className="block text-[10px] uppercase tracking-widest text-[#6b7280] mb-1.5">
        {field.label}
      </label>
      <input
        id={id}
        type={field.type ?? 'text'}
        value={field.type === 'number' ? String(value ?? '') : String(value ?? '')}
        onChange={(e) =>
          onChange(field.key, field.type === 'number' ? Number(e.target.value || 0) : e.target.value)
        }
        className="w-full h-10 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8] focus:border-[#d4a843]/40 transition-colors"
      />
    </div>
  )
}

/* ── Página ─────────────────────────────────────────────────── */

export default function OwnerSettingsPage() {
  const { completeStep } = useAssist()
  const [draft, setDraft]       = useState<OwnerSettings | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)

  const settingsQuery = useQuery({
    queryKey: ['owner-settings'],
    queryFn:  () => api.getOwnerSettings(),
  })

  useEffect(() => {
    if (settingsQuery.data?.item) setDraft(toDraft(settingsQuery.data.item))
  }, [settingsQuery.data?.item])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('Configuração vazia.')
      return api.updateOwnerSettings(draft)
    },
    onSuccess: (result) => {
      setDraft(toDraft(result.item))
      setFeedback('Configurações salvas com sucesso.')
      setError(null)
      completeStep('settings-saved', 'owner-settings')
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Falha ao salvar configurações.')
      setFeedback(null)
    },
  })

  useEffect(() => {
    if (String(draft?.salesAlertEmail || '').trim()) {
      completeStep('alert-email-filled', 'owner-settings')
    }
  }, [completeStep, draft?.salesAlertEmail])

  function handleChange(key: keyof OwnerSettings, value: string | number | boolean) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  return (
    <OwnerLayout>
      <div className="space-y-6">

        {/* ── Cabeçalho ────────────────────────────────────────── */}
        <div>
          <h1 className="text-xl font-bold text-[#f0ede8]">Configurações</h1>
          <p className="mt-0.5 text-xs text-[#6b7280]">
            Dados da loja, alertas de venda, frete e parâmetros de custo operacional.
          </p>
        </div>

        {/* ── Loading ──────────────────────────────────────────── */}
        {settingsQuery.isLoading || !draft ? (
          <div className="flex items-center gap-2 p-4 rounded-xl text-sm text-[#6b7280] bg-white/[0.03] border border-white/[0.07]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando configurações...
          </div>
        ) : (
          <div className="space-y-4">
            {SETTING_SECTIONS.map((section) => (
              <div key={section.title} className="rounded-xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                  <p className="text-sm font-semibold text-[#f0ede8]">{section.title}</p>
                  <p className="text-xs text-[#6b7280] mt-0.5">{section.description}</p>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {section.fields.map((field) => (
                    <SettingsField
                      key={field.key}
                      field={field}
                      draft={draft}
                      onChange={handleChange}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Salvar */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-bold text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] disabled:opacity-70"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {saveMutation.isPending ? 'Salvando...' : 'Salvar configurações'}
              </button>
            </div>
          </div>
        )}

        {/* ── Feedback ─────────────────────────────────────────── */}
        {feedback ? (
          <div className="flex items-center gap-2 p-3 rounded-lg text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
            {feedback}
          </div>
        ) : null}
        {error ? (
          <div className="flex items-center gap-2 p-3 rounded-lg text-xs bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        ) : null}
      </div>
    </OwnerLayout>
  )
}
