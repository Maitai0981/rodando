import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, ChevronRight, Sun, Moon } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BackButton } from '../shared/ui/primitives/BackButton'
import { AccountSidebar } from '../shared/ui/primitives/AccountSidebar'
import { api, friendlyError, type AddressItem } from '../shared/lib/api'
import { useAuth } from '../shared/context/AuthContext'
import { useAssist } from '../shared/context/AssistContext'
import { useSiteTheme } from '../shared/context/ThemeContext'

function AvatarImg({ src, initial, size = 96 }: { src: string; initial: string; size?: number }) {
  const [broken, setBroken] = useState(false)
  const cls = `w-full h-full rounded-full bg-gradient-to-br from-[#d4a843] to-[#f0c040] flex items-center justify-center text-black font-black select-none`
  const fontSize = size >= 80 ? 'text-3xl' : 'text-sm'
  if (broken) return <div className={`${cls} ${fontSize}`}>{initial}</div>
  return <img src={src} alt="Foto de perfil" className="w-full h-full rounded-full object-cover" onError={() => setBroken(true)} />
}

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

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`
  return digits
}

async function fetchAddressByCep(cepValue: string): Promise<{ street: string; district: string; city: string; state: string } | null> {
  const digits = cepValue.replace(/\D/g, '')
  if (digits.length !== 8) return null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
    const data = await res.json() as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string }
    if (data.erro) return null
    return {
      street: data.logradouro ?? '',
      district: data.bairro ?? '',
      city: data.localidade ?? '',
      state: data.uf ?? '',
    }
  } catch {
    return null
  }
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
  const [confirming, setConfirming] = useState(false)

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
          className="min-h-[40px] px-3 py-2 rounded-lg text-xs border border-white/[0.12] text-[#f0ede8]"
        >
          Editar
        </button>
        {!item.isDefault ? (
          <button
            onClick={() => onSetDefault(item.id)}
            className="min-h-[40px] px-3 py-2 rounded-lg text-xs border border-[#d4a843]/40 text-[#d4a843]"
          >
            Tornar principal
          </button>
        ) : null}
        {confirming ? (
          <>
            <span className="text-xs text-[#f87171] self-center">Confirmar remoção?</span>
            <button
              onClick={() => { setConfirming(false); onDelete(item.id) }}
              className="min-h-[40px] px-3 py-2 rounded-lg text-xs bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#f87171] font-bold"
            >
              Sim, remover
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="min-h-[40px] px-3 py-2 rounded-lg text-xs border border-white/[0.12] text-[#f0ede8]"
            >
              Cancelar
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="min-h-[40px] px-3 py-2 rounded-lg text-xs border border-[#ef4444]/40 text-[#f87171]"
          >
            Remover
          </button>
        )}
      </div>
    </div>
  )
}

export default function AccountProfilePage() {
  const queryClient = useQueryClient()
  const { user, status, refreshSession } = useAuth()
  const { completeStep } = useAssist()
  const { theme, setTheme } = useSiteTheme()
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileDocument, setProfileDocument] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
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
      setError(friendlyError(err, 'Falha ao salvar endereço.'))
    },
  })

  function resetAddressForm() {
    setDraft(EMPTY_ADDRESS)
    setEditingAddressId(null)
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Selecione uma imagem válida (JPG, PNG, WebP).')
      if (avatarInputRef.current) avatarInputRef.current.value = ''
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5 MB.')
      if (avatarInputRef.current) avatarInputRef.current.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setAvatarPreview(e.target?.result as string)
    reader.readAsDataURL(file)
    setAvatarFile(file)
  }

  async function handleConfirmAvatar() {
    if (!avatarFile) return
    setAvatarUploading(true)
    setError(null)
    setFeedback(null)
    try {
      await api.uploadAvatar(avatarFile)
      await refreshSession()
      setFeedback('Foto de perfil atualizada.')
      setAvatarPreview(null)
      setAvatarFile(null)
    } catch (err) {
      setError(friendlyError(err, 'Falha ao enviar foto.'))
    } finally {
      setAvatarUploading(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  function handleCancelAvatar() {
    setAvatarPreview(null)
    setAvatarFile(null)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
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
      setError(friendlyError(err, 'Falha ao atualizar perfil.'))
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
      setError(friendlyError(err, 'Falha ao atualizar endereço principal.'))
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
      setError(friendlyError(err, 'Falha ao remover endereço.'))
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <BackButton />
        <div className="flex gap-8 items-start">
        <div className="hidden md:block sticky top-28"><AccountSidebar /></div>
        <div className="flex-1 space-y-6">

        {/* Avatar + atalhos rápidos */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <div className={`w-24 h-24 rounded-full overflow-hidden border-2 ${avatarPreview ? 'border-[#d4a843]' : 'border-[#d4a843]/40'}`}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Pré-visualização" className="w-full h-full rounded-full object-cover" />
                ) : user?.avatarUrl ? (
                  <AvatarImg src={user.avatarUrl} initial={(user?.name ?? 'U')[0].toUpperCase()} size={96} />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#d4a843] to-[#f0c040] flex items-center justify-center text-black font-black text-3xl select-none">
                    {(user?.name ?? 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>
              {!avatarPreview ? (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  aria-label="Trocar foto de perfil"
                  className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-white font-semibold"
                >
                  Trocar
                </button>
              ) : null}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            {avatarPreview ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleConfirmAvatar()}
                  disabled={avatarUploading}
                  className="px-3 py-1.5 rounded-lg text-xs text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold disabled:opacity-60"
                >
                  {avatarUploading ? 'Enviando...' : 'Confirmar foto'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelAvatar}
                  disabled={avatarUploading}
                  className="px-3 py-1.5 rounded-lg text-xs border border-white/[0.12] text-[#f0ede8]"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="text-xs text-[#d4a843] underline underline-offset-2"
              >
                Alterar foto
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-[#f0ede8]">{user?.name}</p>
            <p className="text-sm text-[#6b7280] mb-4">{user?.email}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/orders"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-[#d4a843]/30 text-[#d4a843] hover:bg-[#d4a843]/10 transition-colors"
              >
                Meus Pedidos
              </Link>
              {user?.role === 'owner' ? (
                <Link
                  to="/owner/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-white/[0.12] text-[#f0ede8] hover:bg-white/[0.06] transition-colors"
                >
                  Painel Admin
                </Link>
              ) : null}
            </div>
          </div>
        </div>

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

        {/* Security card */}
        <Link
          to="/account/security"
          className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-[#d4a843]/30 hover:bg-white/[0.05] transition-colors group"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#d4a843]/10 border border-[#d4a843]/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#d4a843]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#f0ede8]">Alterar senha</p>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Um código de verificação será enviado para{' '}
              <span className="text-[#d4a843]">{user?.email}</span>
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#6b7280] group-hover:text-[#d4a843] transition-colors flex-shrink-0" />
        </Link>

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
                    inputMode={field.key === 'cep' ? 'numeric' : undefined}
                    placeholder={field.key === 'cep' ? '00000-000' : undefined}
                    maxLength={field.key === 'cep' ? 9 : undefined}
                    value={draft[field.key]}
                    onChange={(event) => {
                      const value = field.key === 'cep' ? formatCep(event.target.value) : event.target.value
                      setDraft((prev) => ({ ...prev, [field.key]: value }))
                    }}
                    onBlur={field.key === 'cep' ? () => {
                      void fetchAddressByCep(draft.cep).then((addr) => {
                        if (!addr) return
                        setDraft((prev) => ({
                          ...prev,
                          street: addr.street || prev.street,
                          district: addr.district || prev.district,
                          city: addr.city || prev.city,
                          state: addr.state || prev.state,
                        }))
                      })
                    } : undefined}
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


        {/* Aparência */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <h2 className="text-lg text-[#f0ede8] font-bold mb-1">Aparência</h2>
          <p className="text-sm text-[#6b7280] mb-5">Escolha entre o tema escuro e o tema claro.</p>
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                theme === 'dark'
                  ? 'border-[#d4a843] bg-[#d4a843]/10'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-[#0a0a0f] border border-white/10 flex items-center justify-center">
                <Moon className="w-5 h-5 text-[#d4a843]" />
              </div>
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-[#d4a843]' : 'text-[#9ca3af]'}`}>Escuro</span>
              {theme === 'dark' && <span className="text-xs text-[#d4a843] font-bold uppercase tracking-widest">Ativo</span>}
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                theme === 'light'
                  ? 'border-[#d4a843] bg-[#d4a843]/10'
                  : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-[#f9f9f7] border border-black/10 flex items-center justify-center">
                <Sun className="w-5 h-5 text-[#8f5f0b]" />
              </div>
              <span className={`text-sm font-medium ${theme === 'light' ? 'text-[#d4a843]' : 'text-[#9ca3af]'}`}>Claro</span>
              {theme === 'light' && <span className="text-xs text-[#d4a843] font-bold uppercase tracking-widest">Ativo</span>}
            </button>
          </div>
        </div>

        </div>{/* flex-1 */}
        </div>{/* flex row */}
      </div>
    </div>
  )
}
