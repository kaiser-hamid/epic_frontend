export { cn } from "cn"

/** Optional text inputs hold "" in forms; the API expects null. */
export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}
