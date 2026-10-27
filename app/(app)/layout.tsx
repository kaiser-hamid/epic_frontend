import { Suspense } from "react"

import { PageLoader } from "@/components/page-loader"
import { Skeleton } from "@/components/ui/skeleton"

import { AppFrame } from "./_components/app-frame"

export default function AppLayout({ children }: LayoutProps<"/">) {
  // cacheComponents: the shell (usePathname) and pages (params, search params)
  // read request data, so each sits in its own Suspense boundary.
  return <PageLoader />
  return (
    <Suspense fallback={<PageLoader />}>
      <AppFrame>
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
          {children}
        </Suspense>
      </AppFrame>
    </Suspense>
  )
}
