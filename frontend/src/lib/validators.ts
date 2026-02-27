export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isStrongPassword(value: string, minLength = 6) {
  return value.length >= minLength
}
