/** `[id]` segment → positive integer id, or null (caller renders notFound()). */
export function parseRouteId(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null
  }
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
