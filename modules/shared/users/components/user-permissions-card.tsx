"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"

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
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/api-error"
import { useMe } from "@/modules/shared/auth/queries"
import type { Branch } from "@/modules/shared/auth/types"
import { SharedPermission } from "@/modules/shared/rbac/permissions"
import { useCan } from "@/modules/shared/rbac/use-can"
import { userErrorMessages } from "@/modules/shared/users/error-messages"
import {
  useBranchOptions,
  usePermissionCatalog,
  useRoleTemplates,
  useSyncUserBranchPermissions,
  useUserBranchPermissions,
} from "@/modules/shared/users/queries"
import type {
  BranchPermissions,
  PermissionCatalogEntry,
  RoleTemplate,
  User,
} from "@/modules/shared/users/types"

type PermissionGroup = {
  key: string
  module: string
  group: string
  entries: PermissionCatalogEntry[]
}

/** `blood-bank` → "Blood bank". Module ids come from each backend permission enum's `module()`. */
function moduleLabel(module: string): string {
  const words = module.replace(/[-_]+/g, " ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** The catalog arrives ordered by module, group and name; keep that order. */
function groupCatalog(catalog: PermissionCatalogEntry[]): PermissionGroup[] {
  const groups = new Map<string, PermissionGroup>()
  for (const entry of catalog) {
    const key = `${entry.module}:${entry.group}`
    const group = groups.get(key) ?? {
      key,
      module: entry.module,
      group: entry.group,
      entries: [],
    }
    group.entries.push(entry)
    groups.set(key, group)
  }
  return [...groups.values()]
}

const NO_TEMPLATE = ""

/**
 * What the user may do, per branch. A grant in one branch never applies to another.
 * Role templates only pre-check permissions; saving sends the exact list for the branch.
 */
export function UserPermissionsCard({ user }: { user: User }) {
  const { data: me } = useMe()
  const canViewCatalog = useCan(SharedPermission.RoleView)
  const editable = user.abilities.assign_permissions && canViewCatalog

  const grantsQuery = useUserBranchPermissions(user.id)
  const branchOptionsQuery = useBranchOptions(editable)
  const catalogQuery = usePermissionCatalog(canViewCatalog)
  const rolesQuery = useRoleTemplates(editable)

  const grants = grantsQuery.data
  const branches: Branch[] = useMemo(() => {
    const granted = (grants ?? []).map((grant) => grant.branch)
    if (!editable || !branchOptionsQuery.data) {
      return granted
    }
    // Branches that were deactivated keep their grants; keep them selectable to clear them.
    const options = branchOptionsQuery.data
    const extra = granted.filter(
      (branch) => !options.some((option) => option.id === branch.id)
    )
    return [...options, ...extra]
  }, [grants, editable, branchOptionsQuery.data])

  const [chosenBranchId, setChosenBranchId] = useState<number | null>(null)
  const defaultBranchId =
    grants?.[0]?.branch.id ??
    (editable && me ? me.branch.id : undefined) ??
    branches[0]?.id ??
    null
  const branchId =
    chosenBranchId !== null &&
    branches.some((branch) => branch.id === chosenBranchId)
      ? chosenBranchId
      : defaultBranchId
  const branch = branches.find((option) => option.id === branchId) ?? null
  const granted =
    grants?.find((grant) => grant.branch.id === branchId)?.permissions ?? []

  const isLoading =
    grantsQuery.isPending ||
    (editable && branchOptionsQuery.isPending) ||
    (canViewCatalog && catalogQuery.isPending)
  const error =
    grantsQuery.error ?? (editable ? branchOptionsQuery.error : null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions</CardTitle>
        <CardDescription>
          Granted per branch. A permission in one branch does not apply in
          another.
        </CardDescription>
        {branches.length > 0 && !user.is_super_admin ? (
          <CardAction>
            <Select
              value={branchId === null ? "" : String(branchId)}
              onValueChange={(value) => setChosenBranchId(Number(value))}
            >
              <SelectTrigger className="w-48" aria-label="Branch">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.name}
                    <BranchGrantCount grants={grants} branchId={option.id} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {user.is_super_admin ? (
          <p className="text-sm text-muted-foreground">
            Super admin: every permission in every branch. Set only with{" "}
            <code>php artisan auth:super-admin</code>.
          </p>
        ) : isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : error ? (
          <QueryError
            error={error}
            onRetry={() => {
              grantsQuery.refetch()
              branchOptionsQuery.refetch()
            }}
          />
        ) : branch === null ? (
          <p className="text-sm text-muted-foreground">
            No permissions in any branch.
          </p>
        ) : (
          <BranchPermissionEditor
            // Remount on branch change and after a save, so the checks start from the saved list.
            key={`${branch.id}:${granted.join(",")}`}
            user={user}
            branch={branch}
            granted={granted}
            catalog={catalogQuery.data}
            roles={rolesQuery.data ?? []}
            editable={editable}
          />
        )}
      </CardContent>
    </Card>
  )
}

function BranchGrantCount({
  grants,
  branchId,
}: {
  grants: BranchPermissions[] | undefined
  branchId: number
}) {
  const count =
    grants?.find((grant) => grant.branch.id === branchId)?.permissions.length ??
    0
  return count > 0 ? (
    <span className="text-muted-foreground">({count})</span>
  ) : null
}

function BranchPermissionEditor({
  user,
  branch,
  granted,
  catalog,
  roles,
  editable,
}: {
  user: User
  branch: Branch
  granted: string[]
  catalog: PermissionCatalogEntry[] | undefined
  roles: RoleTemplate[]
  editable: boolean
}) {
  const sync = useSyncUserBranchPermissions()
  const [checked, setChecked] = useState(() => new Set(granted))
  const groups = useMemo(() => groupCatalog(catalog ?? []), [catalog])

  const isDirty =
    checked.size !== granted.length ||
    granted.some((permission) => !checked.has(permission))

  if (!catalog) {
    // No catalog access: list the granted names only.
    return granted.length === 0 ? (
      <p className="text-sm text-muted-foreground">
        No permissions in {branch.name}.
      </p>
    ) : (
      <div className="flex flex-wrap gap-1">
        {granted.map((permission) => (
          <Badge key={permission} variant="outline">
            {permission}
          </Badge>
        ))}
      </div>
    )
  }

  function toggle(names: string[], on: boolean) {
    setChecked((current) => {
      const next = new Set(current)
      for (const name of names) {
        if (on) {
          next.add(name)
        } else {
          next.delete(name)
        }
      }
      return next
    })
  }

  function applyTemplate(roleId: string) {
    const role = roles.find((option) => String(option.id) === roleId)
    if (role) {
      toggle(role.permissions, true)
    }
  }

  function save() {
    sync.mutate(
      { userId: user.id, branchId: branch.id, permissions: [...checked] },
      {
        onSuccess: (saved) => {
          toast.success(
            `${saved.permissions.length} permission${saved.permissions.length === 1 ? "" : "s"} saved for ${branch.name}`
          )
        },
        onError: (error) => {
          toast.error(errorMessage(error, userErrorMessages))
        },
      }
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {editable ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={NO_TEMPLATE}
            onValueChange={applyTemplate}
            disabled={roles.length === 0 || sync.isPending}
          >
            <SelectTrigger className="sm:w-64" aria-label="Apply role template">
              <SelectValue
                placeholder={
                  roles.length === 0 ? "No role templates" : "Add from a role…"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={String(role.id)}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            disabled={checked.size === 0 || sync.isPending}
            onClick={() => setChecked(new Set())}
          >
            Clear all
          </Button>
          <span className="text-sm text-muted-foreground sm:ml-auto">
            {checked.size} selected
          </span>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => {
          const names = group.entries.map((entry) => entry.name)
          const selected = names.filter((name) => checked.has(name)).length
          if (!editable && selected === 0) {
            return null
          }
          const groupId = `perm-group-${group.key}`
          return (
            <FieldSet key={group.key} className="gap-3">
              <FieldLegend variant="label" className="mb-0">
                <span className="flex items-center gap-2">
                  {editable ? (
                    <Checkbox
                      id={groupId}
                      aria-label={`All ${group.group} permissions`}
                      checked={
                        selected === 0
                          ? false
                          : selected === names.length
                            ? true
                            : "indeterminate"
                      }
                      disabled={sync.isPending}
                      onCheckedChange={(value) => toggle(names, value === true)}
                    />
                  ) : null}
                  {moduleLabel(group.module)} · {group.group}
                </span>
              </FieldLegend>
              {group.entries.map((entry) => {
                const id = `perm-${entry.name}`
                const isChecked = checked.has(entry.name)
                if (!editable && !isChecked) {
                  return null
                }
                return (
                  <Field key={entry.name} orientation="horizontal">
                    {editable ? (
                      <Checkbox
                        id={id}
                        checked={isChecked}
                        disabled={sync.isPending}
                        onCheckedChange={(value) =>
                          toggle([entry.name], value === true)
                        }
                      />
                    ) : null}
                    <FieldContent>
                      <FieldLabel htmlFor={id} className="font-normal">
                        {entry.description ?? entry.name}
                      </FieldLabel>
                      <FieldDescription className="text-xs">
                        {entry.name}
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                )
              })}
            </FieldSet>
          )
        })}
      </div>

      {editable ? (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={!isDirty || sync.isPending}
            onClick={() => setChecked(new Set(granted))}
          >
            Undo changes
          </Button>
          <Button disabled={!isDirty || sync.isPending} onClick={save}>
            {sync.isPending ? <Spinner /> : null}
            Save permissions for {branch.name}
          </Button>
        </div>
      ) : granted.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No permissions in {branch.name}.
        </p>
      ) : null}
    </div>
  )
}
