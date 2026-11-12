"use client"

import { Forbidden } from "@/components/forbidden"
import { PageHeader } from "@/components/page-header"
import { QueryError } from "@/components/query-error"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorCode, hasErrorCode } from "@/lib/api-error"
import { useBreadcrumbLabel } from "@/modules/shared/layout/breadcrumbs"
import { EditUserForm } from "@/modules/user-management/users/components/user-form"
import { useUser } from "@/modules/user-management/users/queries"

/** Loads the user, then the edit form if the backend allows editing this account. */
export function EditUserView({ userId }: { userId: number }) {
  const query = useUser(userId)
  useBreadcrumbLabel(String(userId), query.data?.username)

  if (query.isPending) {
    return <Skeleton className="h-96 w-full max-w-2xl" />
  }
  if (query.isError) {
    if (hasErrorCode(query.error, ErrorCode.NotFound)) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>User not found</EmptyTitle>
            <EmptyDescription>
              It may have been removed, or the link is wrong.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )
    }
    return <QueryError error={query.error} onRetry={() => query.refetch()} />
  }

  const user = query.data
  if (!user.abilities.update) {
    return <Forbidden description="You cannot edit this account." />
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit user" description={user.name} />
      <EditUserForm key={user.id} user={user} />
    </div>
  )
}
