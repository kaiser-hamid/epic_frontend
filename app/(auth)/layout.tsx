import { Suspense } from "react"

import { Logo } from "@/components/logo"
import { Spinner } from "@/components/ui/spinner"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6">
      <Logo className="h-10" />
      <div className="w-full max-w-sm">
        {/* Auth forms read search params (`next`), which need a Suspense boundary. */}
        <Suspense fallback={<Spinner className="mx-auto size-6" />}>
          {children}
        </Suspense>
      </div>
    </div>
  )
}
