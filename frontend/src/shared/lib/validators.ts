export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isStrongPassword(value: string, minLength = 6) {
  return value.length >= minLength
}

export function isValidCep(value: string) {
  return /^\d{5}-?\d{3}$/.test(String(value || '').trim())
}
