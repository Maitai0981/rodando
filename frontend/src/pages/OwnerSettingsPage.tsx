import { useEffect, useState } from 'react'
import { Alert, Button, Grid, Paper, Stack, TextField, Typography } from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import OwnerLayout from '../layouts/OwnerLayout'
import { api, ApiError, type OwnerSettings } from '../lib/api'
import { useAssist } from '../context/AssistContext'
import { AssistHintInline } from '../components/assist'

function toDraft(item: OwnerSettings): OwnerSettings {
  return { ...item }
}

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
      <Stack spacing={2}>
        <Typography variant="h4">Configurações do owner</Typography>
        <Typography variant="body2" color="text.secondary">
          Defina alertas de venda, endereço da loja, frete e parâmetros de custo operacional.
        </Typography>
        <AssistHintInline tipId="owner-settings-tip-alert" routeKey="owner-settings">
          O email de alerta de venda é obrigatório para operação confiável.
        </AssistHintInline>

        {settingsQuery.isLoading || !draft ? (
          <Paper sx={{ p: 2.4, borderRadius: 3 }}>
            <Typography variant="body2" color="text.secondary">Carregando configurações...</Typography>
          </Paper>
        ) : (
          <Paper sx={{ p: 2.4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Grid container spacing={1.4}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField label="Email de alerta" fullWidth value={draft.salesAlertEmail} onChange={(event) => setDraft((prev) => (prev ? { ...prev, salesAlertEmail: event.target.value } : prev))} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField label="WhatsApp (opcional)" fullWidth value={draft.salesAlertWhatsapp} onChange={(event) => setDraft((prev) => (prev ? { ...prev, salesAlertWhatsapp: event.target.value } : prev))} />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField label="Nome da loja" fullWidth value={draft.storeName} onChange={(event) => setDraft((prev) => (prev ? { ...prev, storeName: event.target.value } : prev))} />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField label="CNPJ" fullWidth value={draft.storeCnpj} onChange={(event) => setDraft((prev) => (prev ? { ...prev, storeCnpj: event.target.value } : prev))} />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField label="IE" fullWidth value={draft.storeIe} onChange={(event) => setDraft((prev) => (prev ? { ...prev, storeIe: event.target.value } : prev))} />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField label="CEP da loja" fullWidth value={draft.storeAddressCep} onChange={(event) => setDraft((prev) => (prev ? { ...prev, storeAddressCep: event.target.value } : prev))} />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField label="Cidade" fullWidth value={draft.storeAddressCity} onChange={(event) => setDraft((prev) => (prev ? { ...prev, storeAddressCity: event.target.value } : prev))} />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField label="UF" fullWidth value={draft.storeAddressState} onChange={(event) => setDraft((prev) => (prev ? { ...prev, storeAddressState: event.target.value } : prev))} />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField label="Meta frete grátis" type="number" fullWidth value={draft.freeShippingGlobalMin} onChange={(event) => setDraft((prev) => (prev ? { ...prev, freeShippingGlobalMin: Number(event.target.value || 0) } : prev))} />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <TextField label="Impostos %" type="number" fullWidth value={draft.taxPercent} onChange={(event) => setDraft((prev) => (prev ? { ...prev, taxPercent: Number(event.target.value || 0) } : prev))} />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <TextField label="Gateway %" type="number" fullWidth value={draft.gatewayFeePercent} onChange={(event) => setDraft((prev) => (prev ? { ...prev, gatewayFeePercent: Number(event.target.value || 0) } : prev))} />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <TextField label="Taxa fixa gateway" type="number" fullWidth value={draft.gatewayFixedFee} onChange={(event) => setDraft((prev) => (prev ? { ...prev, gatewayFixedFee: Number(event.target.value || 0) } : prev))} />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <TextField label="Operacional %" type="number" fullWidth value={draft.operationalPercent} onChange={(event) => setDraft((prev) => (prev ? { ...prev, operationalPercent: Number(event.target.value || 0) } : prev))} />
              </Grid>
              <Grid size={{ xs: 12, md: 3 }}>
                <TextField label="Custo de embalagem" type="number" fullWidth value={draft.packagingCost} onChange={(event) => setDraft((prev) => (prev ? { ...prev, packagingCost: Number(event.target.value || 0) } : prev))} />
              </Grid>
            </Grid>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button variant="contained" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                Salvar configurações
              </Button>
            </Stack>
          </Paper>
        )}

        {feedback ? <Alert severity="success">{feedback}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
    </OwnerLayout>
  )
}
