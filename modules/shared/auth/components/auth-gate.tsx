"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"

import { QueryError } from "@/components/query-error"
import { PageLoader } from "@/components/page-loader"
import { useMe } from "@/modules/shared/auth/queries"

/**
 * Renders the app only for a logged-in user who has no pending forced password
 * change. proxy.ts already redirects when the cookie is missing; this handles
 * an expired session and `must_change_password`.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: me, isPending, error, refetch } = useMe()

  useEffect(() => {
    if (isPending) {
      return
    }
    const next = encodeURIComponent(pathname)
    if (me === null) {
      router.replace(`/login?next=${next}`)
    } else if (me?.must_change_password) {
      router.replace(`/change-password?next=${next}`)
    }
  }, [isPending, me, pathname, router])

  if (error) {
    return (
      <div className="p-6">
        <QueryError error={error} onRetry={() => refetch()} />
      </div>
    )
  }

  if (!me || me.must_change_password) {
    return <PageLoader />
  }

  return children
}
