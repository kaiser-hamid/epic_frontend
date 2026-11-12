"use client"

import { DateTime } from "@/components/date-time"
import { PageHeader } from "@/components/page-header"
import { QueryError } from "@/components/query-error"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorCode, hasErrorCode } from "@/lib/api-error"
import { designationLabel } from "@/modules/shared/auth/enums"
import { useBreadcrumbLabel } from "@/modules/shared/layout/breadcrumbs"
import { UserActionButtons } from "@/modules/user-management/users/components/user-actions"
import { UserAvatar } from "@/modules/user-management/users/components/user-avatar"
import { UserPermissionsCard } from "@/modules/user-management/users/components/user-permissions-card"
import { UserStatusBadges } from "@/modules/user-management/users/components/user-status-badge"
import { useUser } from "@/modules/user-management/users/queries"

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value ?? "—"}</dd>
    </>
  )
}

export function UserDetailView({ userId }: { userId: number }) {
  const query = useUser(userId)
  useBreadcrumbLabel(String(userId), query.data?.username)

  if (query.isPending) {
    return <Skeleton className="h-96 w-full" />
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <UserAvatar size="lg" />
            {user.name}
            <UserStatusBadges user={user} />
          </span>
        }
        description={`${user.username} · ${user.employee_id}`}
        actions={<UserActionButtons user={user} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm md:grid-cols-[auto_1fr_auto_1fr]">
            <Detail label="Name" value={user.name} />
            <Detail label="Username" value={user.username} />
            <Detail label="Employee ID" value={user.employee_id} />
            <Detail
              label="Designation"
              value={designationLabel(user.designation)}
            />
            <Detail label="Phone" value={user.phone} />
            <Detail
              label="Status"
              value={user.is_active ? "Active" : "Disabled"}
            />
            <Detail
              label="Last sign-in"
              value={
                user.last_login_at ? (
                  <DateTime value={user.last_login_at} />
                ) : null
              }
            />
            <Detail
              label="Password"
              value={
                user.must_change_password
                  ? "Must be changed on next sign-in"
                  : "Set by the user"
              }
            />
            <Detail
              label="Locked until"
              value={
                user.is_locked && user.locked_until ? (
                  <DateTime value={user.locked_until} />
                ) : null
              }
            />
            <Detail
              label="Created"
              value={
                user.created_at ? <DateTime value={user.created_at} /> : null
              }
            />
          </dl>
        </CardContent>
      </Card>

      <UserPermissionsCard user={user} />
    </div>
  )
}
