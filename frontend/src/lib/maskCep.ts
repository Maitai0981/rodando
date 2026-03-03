export function normalizeCep(value: string) {
  return String(value || '').replace(/\D/g, '').slice(0, 8)
}

export function maskCep(value: string) {
  const normalized = normalizeCep(value)
  if (normalized.length <= 5) return normalized
  return `${normalized.slice(0, 5)}-${normalized.slice(5)}`
}
