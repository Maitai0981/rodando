import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, type AddressItem } from '../shared/lib/api'
import { useAuth } from '../shared/context/AuthContext'
import { useAssist } from '../shared/context/AssistContext'

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

const ADDRESS_LIMIT = 10

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

const ADDRESS_FIELDS: Array<{ key: keyof AddressDraft; label: string }> = [
  { key: 'label', label: 'Apelido' },
  { key: 'cep', label: 'CEP' },
  { key: 'street', label: 'Rua' },
  { key: 'number', label: 'Numero' },
  { key: 'complement', label: 'Complemento' },
  { key: 'district', label: 'Bairro' },
  { key: 'city', label: 'Cidade' },
  { key: 'state', label: 'Estado' },
  { key: 'reference', label: 'Referencia' },
]

function toAddressDraft(item: AddressItem): AddressDraft {
  return {
    label: item.label || '',
    cep: item.cep || '',
    street: item.street || '',
    number: item.number || '',
    complement: item.complement || '',
    district: item.district || '',
    city: item.city || '',
    state: item.state || '',
    reference: item.reference || '',
  }
}

function AddressCard({
  item,
  onEdit,
  onSetDefault,
  onDelete,
}: {
  item: AddressItem
  onEdit: (item: AddressItem) => void
  onSetDefault: (id: number) => void
  onDelete: (id: number) => void
}) {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
      <div className="flex items-center justify-between mb-2 gap-3">
        <p className="text-sm text-[#f0ede8] font-semibold">{item.label || 'Endereço'}</p>
        {item.isDefault ? (
          <span className="text-xs text-[#d4a843] font-bold">Principal</span>
        ) : null}
      </div>
      <p className="text-xs text-[#9ca3af]">
        {item.street}, {item.number || 's/n'} {item.complement ? `- ${item.complement}` : ''}
      </p>
      <p className="text-xs text-[#9ca3af]">
        {item.district ? `${item.district} - ` : ''}
        {item.city}/{item.state} • CEP {item.cep}
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          onClick={() => onEdit(item)}
          className="px-3 py-1.5 rounded-lg text-xs border border-white/[0.12] text-[#f0ede8]"
        >
          Editar
        </button>
        {!item.isDefault ? (
          <button
            onClick={() => onSetDefault(item.id)}
            className="px-3 py-1.5 rounded-lg text-xs border border-[#d4a843]/40 text-[#d4a843]"
          >
            Tornar principal
          </button>
        ) : null}
        <button
          onClick={() => onDelete(item.id)}
          className="px-3 py-1.5 rounded-lg text-xs border border-[#ef4444]/40 text-[#f87171]"
        >
          Remover
        </button>
      </div>
    </div>
  )
}

export default function AccountProfilePage() {
  const queryClient = useQueryClient()
  const { user, status, refreshSession } = useAuth()
  const { completeStep } = useAssist()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileDocument, setProfileDocument] = useState('')
  const [draft, setDraft] = useState<AddressDraft>(EMPTY_ADDRESS)
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null)

  useEffect(() => {
    setProfileName(user?.name || '')
    setProfilePhone(user?.phone || '')
    setProfileDocument(user?.document || '')
  }, [user?.document, user?.name, user?.phone])

  const addressesQuery = useQuery({
    queryKey: ['account-addresses'],
    queryFn: () => api.listAddresses(),
    enabled: status === 'authenticated',
  })

  const addresses = useMemo(() => addressesQuery.data?.items ?? [], [addressesQuery.data?.items])
  const editingAddress = useMemo(
    () => addresses.find((item) => item.id === editingAddressId) ?? null,
    [addresses, editingAddressId],
  )
  const addressLimitReached = addresses.length >= ADDRESS_LIMIT && editingAddressId == null
  const isAddressDraftEmpty = useMemo(
    () => Object.values(draft).every((value) => value.trim() === ''),
    [draft],
  )

  const saveAddressMutation = useMutation({
    mutationFn: async (mode: 'create' | 'update') => {
      const payload = {
        ...draft,
        lat: editingAddress?.lat ?? null,
        lng: editingAddress?.lng ?? null,
        isDefault: editingAddress?.isDefault ?? false,
      }
      if (mode === 'update' && editingAddressId != null) {
        return api.updateAddress(editingAddressId, payload)
      }
      return api.createAddress(payload)
    },
    onSuccess: async (_, mode) => {
      setDraft(EMPTY_ADDRESS)
      setEditingAddressId(null)
      await queryClient.invalidateQueries({ queryKey: ['account-addresses'] })
      setFeedback(
        mode === 'update' ? 'Endereço atualizado com sucesso.' : 'Endereço cadastrado com sucesso.',
      )
      if (mode === 'create') {
        completeStep('address-created', 'account-profile')
      }
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Falha ao salvar endereço.')
    },
  })

  function resetAddressForm() {
    setDraft(EMPTY_ADDRESS)
    setEditingAddressId(null)
  }

  async function handleSaveProfile() {
    setError(null)
    setFeedback(null)
    try {
      await api.updateProfile({ name: profileName, phone: profilePhone, document: profileDocument })
      await refreshSession()
      setFeedback('Perfil atualizado com sucesso.')
      completeStep('profile-saved', 'account-profile')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao atualizar perfil.')
    }
  }

  function handleEditAddress(item: AddressItem) {
    setError(null)
    setFeedback(null)
    setEditingAddressId(item.id)
    setDraft(toAddressDraft(item))
  }

  function handleSaveAddress() {
    setError(null)
    setFeedback(null)
    if (addressLimitReached) {
      setError(`Você pode cadastrar até ${ADDRESS_LIMIT} endereços de entrega.`)
      return
    }
    void saveAddressMutation.mutate(editingAddressId != null ? 'update' : 'create')
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
      if (editingAddressId === id) {
        resetAddressForm()
      }
      setFeedback('Endereço removido.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao remover endereço.')
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <h1 className="text-2xl mb-2 text-[#f0ede8] font-bold">Minha conta</h1>
            <p className="text-sm text-[#6b7280]">Carregando seus dados...</p>
          </div>
        </div>
      </div>
    )
  }

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <h1 className="text-2xl mb-2 text-[#f0ede8] font-bold">Minha conta</h1>
            <p className="text-sm mb-4 text-[#6b7280]">
              Entre para editar perfil e gerenciar endereços.
            </p>
            <Link
              to="/auth"
              className="inline-flex px-4 py-2 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold"
            >
              Entrar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <h1 className="text-xl mb-1 text-[#f0ede8] font-bold">Editar perfil</h1>
          <p className="text-sm mb-4 text-[#6b7280]">
            Atualize seus dados para facilitar checkout, entrega e atendimento.
          </p>

          {feedback ? (
            <div className="mb-3 p-3 rounded-lg text-sm bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]">
              {feedback}
            </div>
          ) : null}
          {error ? (
            <div className="mb-3 p-3 rounded-lg text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Nome', value: profileName, onChange: setProfileName },
              { label: 'Telefone', value: profilePhone, onChange: setProfilePhone },
              { label: 'Documento', value: profileDocument, onChange: setProfileDocument },
            ].map((field) => {
              const fieldId = `account-profile-${field.label.toLowerCase().replace(/\s+/g, '-')}`
              return (
                <div key={field.label}>
                  <label
                    htmlFor={fieldId}
                    className="text-xs uppercase tracking-widest text-[#d4a843]"
                  >
                    {field.label}
                  </label>
                  <input
                    id={fieldId}
                    aria-label={field.label}
                    title={field.label}
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                  />
                </div>
              )
            })}
          </div>
          <button
            onClick={() => void handleSaveProfile()}
            className="mt-4 px-4 py-2 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold"
          >
            Salvar perfil
          </button>
        </div>

        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg text-[#f0ede8] font-bold">Endereços de entrega</h2>
              <p className="text-sm text-[#6b7280]">
                Cadastre, edite e organize até 10 locais de entrega.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full border border-[#d4a843]/20 bg-[#d4a843]/10 px-3 py-1 text-xs font-semibold text-[#d4a843]">
              {addresses.length}/{ADDRESS_LIMIT} cadastrados
            </span>
          </div>

          {addressesQuery.isLoading ? (
            <p className="mt-4 text-sm text-[#6b7280]">Carregando endereços...</p>
          ) : addresses.length === 0 ? (
            <p className="mt-4 text-sm text-[#6b7280]">Nenhum endereço cadastrado ainda.</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((address) => (
                <AddressCard
                  key={address.id}
                  item={address}
                  onEdit={handleEditAddress}
                  onSetDefault={handleSetDefault}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-white/[0.06]">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-sm text-[#f0ede8] font-semibold">
                  {editingAddressId != null ? 'Editar endereço' : 'Adicionar endereço'}
                </h3>
                <p className="text-xs text-[#6b7280]">
                  {editingAddressId != null
                    ? 'Atualize este endereço e salve as alterações.'
                    : 'Você pode cadastrar até 10 endereços de entrega.'}
                </p>
              </div>
              {addressLimitReached ? (
                <p className="text-xs text-[#d4a843]">
                  Limite atingido. Edite ou remova um endereço para cadastrar outro.
                </p>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              {ADDRESS_FIELDS.map((field) => (
                <div key={field.key}>
                  <label
                    htmlFor={`account-address-${field.key}`}
                    className="text-xs uppercase tracking-widest text-[#d4a843]"
                  >
                    {field.label}
                  </label>
                  <input
                    id={`account-address-${field.key}`}
                    aria-label={field.label}
                    title={field.label}
                    value={draft[field.key]}
                    onChange={(event) =>
                      setDraft((prev) => ({
                        ...prev,
                        [field.key]: event.target.value,
                      }))
                    }
                    className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={handleSaveAddress}
                className={`px-4 py-2 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold ${
                  saveAddressMutation.isPending || addressLimitReached
                    ? 'opacity-70'
                    : 'opacity-100'
                }`}
                disabled={saveAddressMutation.isPending || addressLimitReached}
              >
                {saveAddressMutation.isPending
                  ? 'Salvando...'
                  : editingAddressId != null
                    ? 'Salvar endereço'
                    : 'Adicionar endereço'}
              </button>

              {!isAddressDraftEmpty || editingAddressId != null ? (
                <button
                  type="button"
                  onClick={resetAddressForm}
                  className="px-4 py-2 rounded-xl text-sm border border-white/[0.12] text-[#f0ede8]"
                >
                  {editingAddressId != null ? 'Cancelar edição' : 'Limpar formulário'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
