import { useMemo, useState } from 'react'
import { Alert, Button, Divider, Grid, Paper, Stack, TextField, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AppShell } from '../layouts/AppShell'
import { useAuth } from '../context/AuthContext'
import { useAssist } from '../context/AssistContext'
import { api, ApiError, type AddressItem } from '../lib/api'
import { ActionGuardDialog, AssistHintInline, TaskEmptyStateGuide } from '../components/assist'

type AddressDraft = {
  label: string
  cep: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  state: string
  reference: string
}

const EMPTY_ADDRESS: AddressDraft = {
  label: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
  reference: '',
}

function AddressCard({
  item,
  onSetDefault,
  onDelete,
}: {
  item: AddressItem
  onSetDefault: (id: number) => void
  onDelete: (id: number) => void
}) {
  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.2 }}>
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle2">{item.label || 'Endereço'}</Typography>
          {item.isDefault ? (
            <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700 }}>
              Principal
            </Typography>
          ) : null}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {item.street}, {item.number || 's/n'} {item.complement ? `- ${item.complement}` : ''}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {item.district ? `${item.district} - ` : ''}
          {item.city}/{item.state} • CEP {item.cep}
        </Typography>
        <Stack direction="row" spacing={1}>
          {!item.isDefault ? (
            <Button size="small" variant="outlined" onClick={() => onSetDefault(item.id)}>
              Tornar principal
            </Button>
          ) : null}
          <Button size="small" color="error" onClick={() => onDelete(item.id)}>
            Remover
          </Button>
        </Stack>
      </Stack>
    </Paper>
  )
}

export default function AccountProfilePage() {
  const queryClient = useQueryClient()
  const { user, status, refreshSession } = useAuth()
  const { completeStep, trackAssistEvent } = useAssist()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [profileName, setProfileName] = useState(user?.name || '')
  const [profilePhone, setProfilePhone] = useState(user?.phone || '')
  const [profileDocument, setProfileDocument] = useState(user?.document || '')
  const [draft, setDraft] = useState<AddressDraft>(EMPTY_ADDRESS)
  const [deleteAddressId, setDeleteAddressId] = useState<number | null>(null)

  const addressesQuery = useQuery({
    queryKey: ['account-addresses'],
    queryFn: () => api.listAddresses(),
    enabled: status === 'authenticated',
  })

  const createAddressMutation = useMutation({
    mutationFn: () =>
      api.createAddress({
        ...draft,
        lat: null,
        lng: null,
        isDefault: false,
      }),
    onSuccess: async () => {
      setDraft(EMPTY_ADDRESS)
      await queryClient.invalidateQueries({ queryKey: ['account-addresses'] })
      setFeedback('Endereço cadastrado com sucesso.')
      completeStep('address-created', 'account-profile')
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Falha ao cadastrar endereço.')
    },
  })

  const addresses = useMemo(() => addressesQuery.data?.items ?? [], [addressesQuery.data?.items])

  async function handleSaveProfile() {
    setError(null)
    setFeedback(null)
    try {
      await api.updateProfile({
        name: profileName,
        phone: profilePhone,
        document: profileDocument,
      })
      await refreshSession()
      setFeedback('Perfil atualizado com sucesso.')
      completeStep('profile-saved', 'account-profile')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao atualizar perfil.')
    }
  }

  async function handleSetDefault(id: number) {
    setError(null)
    setFeedback(null)
    try {
      await api.setDefaultAddress(id)
      await queryClient.invalidateQueries({ queryKey: ['account-addresses'] })
      await refreshSession()
      setFeedback('Endereço principal atualizado.')
      completeStep('default-address-set', 'account-profile')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao atualizar endereço principal.')
    }
  }

  async function handleDelete(id: number) {
    setError(null)
    setFeedback(null)
    try {
      await api.deleteAddress(id)
      await queryClient.invalidateQueries({ queryKey: ['account-addresses'] })
      await refreshSession()
      setFeedback('Endereço removido.')
      setDeleteAddressId(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao remover endereço.')
    }
  }

  if (status !== 'authenticated') {
    return (
      <AppShell>
        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h5" sx={{ mb: 1 }}>
            Minha conta
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Entre para editar perfil e gerenciar endereços.
          </Typography>
          <Button component={RouterLink} to="/auth" variant="contained">
            Entrar
          </Button>
        </Paper>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Stack spacing={2.2}>
        <Paper sx={{ p: 2.2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h5">Perfil</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Atualize seus dados para facilitar checkout, entrega e atendimento.
          </Typography>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Nome"
                fullWidth
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="Telefone"
                fullWidth
                value={profilePhone}
                onChange={(event) => setProfilePhone(event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                label="CPF/CNPJ"
                fullWidth
                value={profileDocument}
                onChange={(event) => setProfileDocument(event.target.value)}
              />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => void handleSaveProfile()}>
              Salvar perfil
            </Button>
            <Button component={RouterLink} to="/orders" variant="outlined">
              Ver meus pedidos
            </Button>
          </Stack>
        </Paper>

        <Paper sx={{ p: 2.2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Meus endereços (máx. 10)
          </Typography>
          <AssistHintInline tipId="profile-tip-default" routeKey="account-profile">
            Defina um endereço principal para acelerar o checkout.
          </AssistHintInline>
          <Grid container spacing={1.2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField label="Rótulo" fullWidth value={draft.label} onChange={(event) => setDraft((prev) => ({ ...prev, label: event.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField label="CEP" fullWidth value={draft.cep} onChange={(event) => setDraft((prev) => ({ ...prev, cep: event.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField label="Logradouro" fullWidth value={draft.street} onChange={(event) => setDraft((prev) => ({ ...prev, street: event.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField label="Número" fullWidth value={draft.number} onChange={(event) => setDraft((prev) => ({ ...prev, number: event.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField label="Complemento" fullWidth value={draft.complement} onChange={(event) => setDraft((prev) => ({ ...prev, complement: event.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField label="Bairro" fullWidth value={draft.district} onChange={(event) => setDraft((prev) => ({ ...prev, district: event.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField label="Cidade" fullWidth value={draft.city} onChange={(event) => setDraft((prev) => ({ ...prev, city: event.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, md: 1 }}>
              <TextField label="UF" fullWidth value={draft.state} onChange={(event) => setDraft((prev) => ({ ...prev, state: event.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField label="Referência" fullWidth value={draft.reference} onChange={(event) => setDraft((prev) => ({ ...prev, reference: event.target.value }))} />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Button variant="contained" onClick={() => createAddressMutation.mutate()} disabled={createAddressMutation.isPending}>
              Adicionar endereço
            </Button>
          </Stack>

          <Divider sx={{ my: 2 }} />
          <Stack spacing={1}>
            {addresses.map((item) => (
              <AddressCard key={item.id} item={item} onSetDefault={handleSetDefault} onDelete={(id) => setDeleteAddressId(id)} />
            ))}
            {addresses.length === 0 ? (
              <TaskEmptyStateGuide
                title="Nenhum endereço cadastrado"
                description="Adicione um endereço para liberar entrega no checkout."
                ctaLabel="Preencher endereço acima"
                onCtaClick={() => {
                  trackAssistEvent('assist_empty_state_cta', { routeKey: 'account-profile', target: 'address-form' })
                }}
              />
            ) : null}
          </Stack>
        </Paper>

        {feedback ? <Alert severity="success">{feedback}</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>

      <ActionGuardDialog
        open={Boolean(deleteAddressId)}
        title="Remover endereço?"
        description="Essa ação pode impactar entregas em pedidos futuros."
        impacts={[
          'Se este endereço for principal, você precisará definir outro.',
          'Pedidos antigos continuam com snapshot salvo.',
        ]}
        confirmLabel="Sim, remover endereço"
        confirmColor="error"
        onCancel={() => setDeleteAddressId(null)}
        onConfirm={() => {
          if (!deleteAddressId) return
          void handleDelete(deleteAddressId)
        }}
      />
    </AppShell>
  )
}
