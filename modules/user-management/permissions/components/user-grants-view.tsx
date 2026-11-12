"use client"

import { CopyIcon, SaveIcon, Undo2Icon } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { PageHeader } from "@/components/page-header"
import { QueryError } from "@/components/query-error"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/api-error"
import { cn } from "@/lib/utils"
import { designationLabel } from "@/modules/shared/auth/enums"
import { useMe } from "@/modules/shared/auth/queries"
import { useBreadcrumbLabel } from "@/modules/shared/layout/breadcrumbs"
import { CopyFromDialog } from "@/modules/user-management/permissions/components/copy-from-dialog"
import { GrantEditor } from "@/modules/user-management/permissions/components/grant-editor"
import {
  buildGrantModules,
  fullyTickedRoleIds,
  type GrantModule,
  modulesForBranch,
  offeredNames,
  sameSelection,
} from "@/modules/user-management/permissions/grant-sections"
import { userErrorMessages } from "@/modules/user-management/users/error-messages"
import {
  useBranchOptions,
  usePermissionCatalog,
  useRoleTemplates,
  useSyncUserBranchPermissions,
  useUser,
  useUserBranchPermissions,
} from "@/modules/user-management/users/queries"
import type {
  BranchPermissions,
  BranchWithModules,
  User,
} from "@/modules/user-management/users/types"

/** Stable empty lists, so memoized selections don't reset every render. */
const noPermissions: string[] = []
const noModules: string[] = []

function plural(count: number): string {
  return `${count} permission${count === 1 ? "" : "s"}`
}

/** Active branches plus deactivated ones the user still holds grants in (so they can be cleared). */
function branchList(
  options: BranchWithModules[],
  grants: BranchPermissions[]
): BranchWithModules[] {
  const extra = grants
    .map((grant) => grant.branch)
    .filter((branch) => !options.some((option) => option.id === branch.id))
  return [...options, ...extra]
}

/** The grants page of one user: branches on the left, role templates and permissions of one branch on the right. */
export function UserGrantsView({ userId }: { userId: number }) {
  const userQuery = useUser(userId)
  const grantsQuery = useUserBranchPermissions(userId)
  const branchesQuery = useBranchOptions()
  const catalogQuery = usePermissionCatalog()
  const rolesQuery = useRoleTemplates()
  useBreadcrumbLabel(String(userId), userQuery.data?.name)

  const queries = [
    userQuery,
    grantsQuery,
    branchesQuery,
    catalogQuery,
    rolesQuery,
  ]
  const failed = queries.find((query) => query.isError)
  if (failed) {
    return (
      <QueryError
        error={failed.error}
        onRetry={() => queries.forEach((query) => query.refetch())}
      />
    )
  }
  if (
    !userQuery.data ||
    !grantsQuery.data ||
    !branchesQuery.data ||
    !catalogQuery.data ||
    !rolesQuery.data
  ) {
    return <Skeleton className="h-96 w-full" />
  }

  return (
    <GrantsEditorPage
      user={userQuery.data}
      grants={grantsQuery.data}
      branches={branchList(branchesQuery.data, grantsQuery.data)}
      modules={buildGrantModules(catalogQuery.data, rolesQuery.data)}
    />
  )
}

function GrantsEditorPage({
  user,
  grants,
  branches,
  modules,
}: {
  user: User
  grants: BranchPermissions[]
  branches: BranchWithModules[]
  modules: GrantModule[]
}) {
  const { data: me } = useMe()
  const sync = useSyncUserBranchPermissions()
  const editable = user.abilities.assign_permissions && !user.is_super_admin

  const [chosenBranchId, setChosenBranchId] = useState<number | null>(null)
  const [draft, setDraft] = useState<Set<string> | null>(null)
  const [switchTo, setSwitchTo] = useState<BranchWithModules | null>(null)
  const [copyOpen, setCopyOpen] = useState(false)

  const savedIn = (branchId: number): string[] =>
    grants.find((grant) => grant.branch.id === branchId)?.permissions ??
    noPermissions

  const branch =
    branches.find((option) => option.id === chosenBranchId) ??
    branches.find((option) => option.id === grants[0]?.branch.id) ??
    branches.find((option) => option.id === me?.branch.id) ??
    branches[0] ??
    null

  // A branch offers every common module plus the optional ones it runs (Blood Bank: East Gate only).
  const branchModules = branch?.modules ?? noModules
  const branchGrantModules = useMemo(
    () => modulesForBranch(modules, branchModules),
    [modules, branchModules]
  )
  const offered = useMemo(
    () => offeredNames(branchGrantModules),
    [branchGrantModules]
  )

  const savedAll = branch ? savedIn(branch.id) : noPermissions
  const saved = useMemo(
    () => savedAll.filter((name) => offered.has(name)),
    [savedAll, offered]
  )
  // Held from before a module was switched off for this branch: they allow nothing, and Save removes them.
  const leftoverCount = savedAll.length - saved.length
  const leftoverLabels = modules
    .filter(
      (module) =>
        !branchGrantModules.includes(module) &&
        module.sections.some((section) =>
          section.entries.some((entry) => savedAll.includes(entry.name))
        )
    )
    .map((module) => module.label)
    .join(", ")

  const checked = useMemo(() => draft ?? new Set(saved), [draft, saved])
  const isDirty = draft !== null && !sameSelection(draft, saved)
  const canSave = isDirty || leftoverCount > 0

  const total =
    grants.reduce((sum, grant) => sum + grant.permissions.length, 0) -
    savedAll.length +
    checked.size

  useEffect(() => {
    if (!isDirty) {
      return
    }
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [isDirty])

  function openBranch(next: BranchWithModules) {
    if (next.id === branch?.id) {
      return
    }
    if (isDirty) {
      setSwitchTo(next)
      return
    }
    setDraft(null)
    setChosenBranchId(next.id)
  }

  function save() {
    if (!branch) {
      return
    }
    sync.mutate(
      {
        userId: user.id,
        branchId: branch.id,
        permissions: [...checked].sort(),
        appliedRoleIds: fullyTickedRoleIds(branchGrantModules, checked),
      },
      {
        onSuccess: (result) => {
          setDraft(null)
          toast.success(
            `${plural(result.permissions.length)} saved for ${branch.name}`
          )
        },
        onError: (error) => toast.error(errorMessage(error, userErrorMessages)),
      }
    )
  }

  const subtitle = [
    user.employee_id,
    user.username,
    designationLabel(user.designation),
  ]
    .filter(Boolean)
    .join(" · ")

  // From md up the page fills the viewport below the app header (h-16, or h-12 with the sidebar
  // collapsed to icons) and main's padding, so only the permission list scrolls.
  return (
    <div className="flex flex-col gap-6 md:h-[calc(100svh-7rem)] md:group-has-data-[collapsible=icon]/sidebar-wrapper:h-[calc(100svh-6rem)]">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {user.name}
            {user.is_super_admin ? (
              <Badge variant="info">Super admin</Badge>
            ) : (
              <Badge variant="success" className="tabular-nums">
                {plural(total)}
              </Badge>
            )}
          </span>
        }
        description={subtitle}
        actions={
          editable && branch ? (
            <>
              <Button
                variant="outline"
                disabled={sync.isPending}
                onClick={() => setCopyOpen(true)}
              >
                <CopyIcon data-icon="inline-start" />
                Copy from…
              </Button>
              <Button
                variant="outline"
                disabled={!isDirty || sync.isPending}
                onClick={() => setDraft(null)}
              >
                <Undo2Icon data-icon="inline-start" />
                Undo
              </Button>
              <Button disabled={!canSave || sync.isPending} onClick={save}>
                {sync.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <SaveIcon data-icon="inline-start" />
                )}
                Save
              </Button>
            </>
          ) : null
        }
      />

      {user.is_super_admin ? (
        <Alert>
          <AlertDescription>
            Super admin: every permission in every branch. Set only with{" "}
            <code>php artisan auth:super-admin</code>.
          </AlertDescription>
        </Alert>
      ) : !editable ? (
        <Alert>
          <AlertDescription>
            Read only. You cannot change your own permissions, and only a super
            admin can change a super admin.
          </AlertDescription>
        </Alert>
      ) : null}

      {user.is_super_admin ? null : branch === null ? (
        <p className="text-sm text-muted-foreground">No active branches.</p>
      ) : (
        <div className="grid items-start gap-4 md:min-h-0 md:flex-1 md:grid-cols-[15rem_1fr] md:grid-rows-[minmax(0,1fr)]">
          <Card className="py-2 md:max-h-full md:overflow-y-auto">
            <CardContent className="px-2">
              <nav aria-label="Branches" className="flex flex-col gap-0.5">
                {branches.map((option) => {
                  const active = option.id === branch.id
                  const count = active
                    ? checked.size
                    : savedIn(option.id).length
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-current={active ? "true" : undefined}
                      onClick={() => openBranch(option)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                        active && "bg-muted font-medium"
                      )}
                    >
                      <span className="flex-1 truncate">{option.name}</span>
                      {active && isDirty ? (
                        <span
                          className="size-2 rounded-full bg-warning"
                          aria-label="Unsaved changes"
                        />
                      ) : null}
                      <span
                        className={cn(
                          "text-xs tabular-nums",
                          count > 0 ? "text-success" : "text-muted-foreground"
                        )}
                      >
                        {count > 0 ? count : "—"}
                      </span>
                    </button>
                  )
                })}
              </nav>
            </CardContent>
          </Card>

          <Card className="md:max-h-full">
            <CardHeader>
              <CardTitle>{branch.name}</CardTitle>
              <CardDescription>
                {plural(checked.size)} selected
                {isDirty ? " · unsaved changes" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 md:min-h-0 md:overflow-y-auto">
              {leftoverCount > 0 ? (
                <Alert>
                  <AlertDescription>
                    {plural(leftoverCount)} from {leftoverLabels}{" "}
                    {leftoverCount === 1 ? "does" : "do"} nothing here, because{" "}
                    {branch.name} does not run {leftoverLabels}.
                    {editable ? " Save to remove them." : ""}
                  </AlertDescription>
                </Alert>
              ) : null}
              <GrantEditor
                modules={branchGrantModules}
                checked={checked}
                onChange={setDraft}
                disabled={!editable || sync.isPending}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={switchTo !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSwitchTo(null)
          }
        }}
        title={`Discard changes to ${branch?.name ?? "this branch"}?`}
        description="Your unsaved selection will be lost."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          if (switchTo) {
            setDraft(null)
            setChosenBranchId(switchTo.id)
          }
          setSwitchTo(null)
        }}
      />

      {editable && branch ? (
        <CopyFromDialog
          open={copyOpen}
          onOpenChange={setCopyOpen}
          branch={branch}
          targetUserId={user.id}
          onCopy={(permissions, source) => {
            setDraft(new Set(permissions.filter((name) => offered.has(name))))
            toast.success(
              `Copied ${plural(permissions.length)} from ${source.name}. Press Save to apply.`
            )
          }}
        />
      ) : null}
    </div>
  )
}
