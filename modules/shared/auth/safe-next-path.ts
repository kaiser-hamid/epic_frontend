/** Only same-origin relative paths are allowed as a post-login redirect (no open redirects). */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/"
  }
  if (next.startsWith("/login") || next.startsWith("/change-password")) {
    return "/"
  }
  return next
}
