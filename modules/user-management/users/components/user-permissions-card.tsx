"use client"

import { PencilIcon } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"

import { QueryError } from "@/components/query-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SharedPermission } from "@/modules/shared/rbac/permissions"
import { useCan } from "@/modules/shared/rbac/use-can"
import {
  usePermissionCatalog,
  useUserBranchPermissions,
} from "@/modules/user-management/users/queries"
import type {
  BranchPermissions,
  PermissionCatalogEntry,
  User,
} from "@/modules/user-management/users/types"

type HeldGroup = {
  key: string
  title: string
  entries: PermissionCatalogEntry[]
}

/** Only the modules the user holds something in, in catalog (module) order. Unknown names get their own group. */
function heldGroups(
  catalog: PermissionCatalogEntry[],
  permissions: string[]
): HeldGroup[] {
  const held = new Set(permissions)
  const groups = new Map<string, HeldGroup>()
  for (const entry of catalog) {
    if (!held.has(entry.name)) {
      continue
    }
    held.delete(entry.name)
    const key = entry.module
    const group = groups.get(key) ?? {
      key,
      title: entry.module_label,
      entries: [],
    }
    group.entries.push(entry)
    groups.set(key, group)
  }
  if (held.size > 0) {
    groups.set("unknown", {
      key: "unknown",
      title: "Other",
      entries: [...held].map((name) => ({
        name,
        module: "",
        module_label: "Other",
        module_order: 0,
        group: "",
        description: null,
      })),
    })
  }
  return [...groups.values()]
}

/** What the user holds, per branch, read only. Changes are made on the Permissions screen. */
export function UserPermissionsCard({ user }: { user: User }) {
  const canAssign = useCan(SharedPermission.UserAssignPermissions)
  const grantsQuery = useUserBranchPermissions(user.id)
  const catalogQuery = usePermissionCatalog()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions</CardTitle>
        <CardDescription>
          Granted per branch. A permission in one branch does not apply in
          another.
        </CardDescription>
        {canAssign && user.abilities.assign_permissions ? (
          <CardAction>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/user-management/permissions/${user.id}`}>
                <PencilIcon data-icon="inline-start" />
                Edit permissions
              </Link>
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {user.is_super_admin ? (
          <p className="text-sm text-muted-foreground">
            Super admin: every permission in every branch.
          </p>
        ) : grantsQuery.isPending || catalogQuery.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : grantsQuery.isError || catalogQuery.isError ? (
          <QueryError
            error={grantsQuery.error ?? catalogQuery.error}
            onRetry={() => {
              grantsQuery.refetch()
              catalogQuery.refetch()
            }}
          />
        ) : grantsQuery.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No permissions in any branch.
          </p>
        ) : (
          <div className="flex flex-col divide-y">
            {grantsQuery.data.map((grant) => (
              <BranchSummary
                key={grant.branch.id}
                grant={grant}
                catalog={catalogQuery.data}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BranchSummary({
  grant,
  catalog,
}: {
  grant: BranchPermissions
  catalog: PermissionCatalogEntry[]
}) {
  const groups = useMemo(
    () => heldGroups(catalog, grant.permissions),
    [catalog, grant.permissions]
  )

  return (
    <section className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium">{grant.branch.name}</h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {grant.permissions.length}
        </span>
        {grant.matched_roles.map((role) => (
          <Badge key={role.id} variant="success">
            {role.name}
          </Badge>
        ))}
      </div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <div key={group.key} className="flex flex-col gap-1">
            <dt className="text-xs font-medium text-muted-foreground">
              {group.title}
            </dt>
            {group.entries.map((entry) => (
              <dd key={entry.name} className="text-sm">
                {entry.description ?? entry.name}
              </dd>
            ))}
          </div>
        ))}
      </dl>
    </section>
  )
}
