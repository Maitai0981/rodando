export function cx(...items: Array<string | undefined | null | false>) {
  return items.filter(Boolean).join(' ')
}
