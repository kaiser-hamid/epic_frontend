import { NextResponse, type NextRequest } from "next/server"

import { serverEnv } from "@/lib/env"

/**
 * Optimistic check only: no session cookie → login. It never validates the
 * session; Laravel authorizes every API request and AuthGate handles expiry.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(serverEnv.SESSION_COOKIE)) {
    return NextResponse.next()
  }

  const loginUrl = new URL("/login", request.url)
  const next = request.nextUrl.pathname + request.nextUrl.search
  if (next !== "/") {
    loginUrl.searchParams.set("next", next)
  }
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Everything except auth pages, the API/Sanctum rewrites and static files.
  matcher: [
    "/((?!login|api|sanctum|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
