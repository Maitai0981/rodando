import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import OwnerLayout from '../shared/layout/OwnerLayout'
import { api, ApiError, type OwnerSettings } from '../shared/lib/api'
import { useAssist } from '../shared/context/AssistContext'

function toDraft(item: OwnerSettings): OwnerSettings {
  return { ...item }
}

type FieldDescriptor = { key: keyof OwnerSettings; label: string; type?: 'number' | 'checkbox' }

const SETTINGS_FIELDS: FieldDescriptor[] = [
  { key: 'salesAlertEmail', label: 'Email de alerta' },
  { key: 'salesAlertWhatsapp', label: 'WhatsApp (opcional)' },
  { key: 'storeName', label: 'Nome da loja' },
  { key: 'storeCnpj', label: 'CNPJ' },
  { key: 'storeIe', label: 'IE' },
  { key: 'storeAddressStreet', label: 'Rua' },
  { key: 'storeAddressNumber', label: 'Numero' },
  { key: 'storeAddressComplement', label: 'Complemento' },
  { key: 'storeAddressDistrict', label: 'Bairro' },
  { key: 'storeAddressCity', label: 'Cidade' },
  { key: 'storeAddressState', label: 'UF' },
  { key: 'storeAddressCep', label: 'CEP da loja' },
  { key: 'taxProfile', label: 'Perfil tributario' },
  { key: 'storeLat', label: 'Latitude', type: 'number' },
  { key: 'storeLng', label: 'Longitude', type: 'number' },
  { key: 'freeShippingGlobalMin', label: 'Meta frete gratis', type: 'number' },
  { key: 'taxPercent', label: 'Impostos %', type: 'number' },
  { key: 'gatewayFeePercent', label: 'Gateway %', type: 'number' },
  { key: 'gatewayFixedFee', label: 'Taxa fixa gateway', type: 'number' },
  { key: 'operationalPercent', label: 'Operacional %', type: 'number' },
  { key: 'packagingCost', label: 'Custo de embalagem', type: 'number' },
  { key: 'blockBelowMinimum', label: 'Bloquear abaixo do minimo', type: 'checkbox' },
]

export default function OwnerSettingsPage() {
  const { completeStep } = useAssist()
  const [draft, setDraft] = useState<OwnerSettings | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const settingsQuery = useQuery({
    queryKey: ['owner-settings'],
    queryFn: () => api.getOwnerSettings(),
  })

  useEffect(() => {
    if (settingsQuery.data?.item) {
      setDraft(toDraft(settingsQuery.data.item))
    }
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

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl text-[#f0ede8] font-bold">Configurações do owner</h1>
          <p className="text-sm text-[#9ca3af]">
            Defina alertas de venda, endereço da loja, frete e parâmetros de custo operacional.
          </p>
        </div>

        {settingsQuery.isLoading || !draft ? (
          <div className="p-3 rounded-xl text-sm bg-white/[0.04] border border-white/[0.08] text-[#9ca3af]">
            Carregando configurações...
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SETTINGS_FIELDS.map((field) => {
                const value = draft?.[field.key]
                if (field.type === 'checkbox') {
                  return (
                    <div key={field.key} className="md:col-span-3 pt-2">
                      <label className="flex items-center gap-2 text-sm text-[#f0ede8]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#d4a843]"
                          checked={Boolean(value)}
                          onChange={(event) =>
                            setDraft((prev) =>
                              prev ? { ...prev, [field.key]: event.target.checked } : prev,
                            )
                          }
                        />
                        {field.label}
                      </label>
                    </div>
                  )
                }
                const fieldId = `owner-settings-${field.key}`
                return (
                  <div key={field.key}>
                    <label htmlFor={fieldId} className="text-[11px] uppercase tracking-widest text-[#f0c040]">
                      {field.label}
                    </label>
                    <input
                      id={fieldId}
                      type={field.type || 'text'}
                      value={field.type === 'number' ? String(value ?? '') : String(value ?? '')}
                      onChange={(event) =>
                        setDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                [field.key]: field.type === 'number' ? Number(event.target.value || 0) : event.target.value,
                              }
                            : prev,
                        )
                      }
                      className="w-full mt-2 h-11 px-3 rounded-xl text-sm outline-none bg-white/[0.06] border border-white/[0.12] text-[#f0ede8]"
                    />
                  </div>
                )
              })}
            </div>
            <button
              onClick={() => saveMutation.mutate()}
              className={`mt-4 h-11 px-5 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold ${
                saveMutation.isPending ? 'opacity-70' : 'opacity-100'
              }`}
              disabled={saveMutation.isPending}
            >
              Salvar configurações
            </button>
          </div>
        )}

        {feedback ? (
          <div className="p-3 rounded-xl text-sm bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]">
            {feedback}
          </div>
        ) : null}
        {error ? (
          <div className="p-3 rounded-xl text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
            {error}
          </div>
        ) : null}
      </div>
    </OwnerLayout>
  )
}
