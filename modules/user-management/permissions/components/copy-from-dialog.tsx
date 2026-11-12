"use client"

import { CheckIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { cn } from "@/lib/utils"
import type { Branch } from "@/modules/shared/auth/types"
import { useUserAccessList } from "@/modules/user-management/permissions/queries"
import type { UserAccess } from "@/modules/user-management/permissions/types"
import { useUserBranchPermissions } from "@/modules/user-management/users/queries"

type CopyFromDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  branch: Branch
  /** The user being edited; left out of the list. */
  targetUserId: number
  /** Replaces the draft for `branch`; nothing is saved here. */
  onCopy: (permissions: string[], source: UserAccess) => void
}

function countIn(user: UserAccess, branchId: number): number {
  return (
    user.branches.find((access) => access.branch.id === branchId)
      ?.permission_count ?? 0
  )
}

/** Pick a colleague; their permissions in this branch replace the draft. Saving stays manual. */
export function CopyFromDialog({
  open,
  onOpenChange,
  branch,
  targetUserId,
  onCopy,
}: CopyFromDialogProps) {
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<UserAccess | null>(null)
  const debouncedSearch = useDebouncedValue(search)

  const list = useUserAccessList(
    { filter: { search: debouncedSearch.trim() || null }, per_page: 20 },
    open
  )
  const source = useUserBranchPermissions(selected?.id ?? 0, selected !== null)

  const candidates = (list.data?.data ?? []).filter(
    (user) => user.id !== targetUserId && !user.is_super_admin
  )

  function close(next: boolean) {
    if (!next) {
      setSearch("")
      setSelected(null)
    }
    onOpenChange(next)
  }

  function copy() {
    if (!selected || !source.data) {
      return
    }
    const permissions =
      source.data.find((grant) => grant.branch.id === branch.id)?.permissions ??
      []
    onCopy(permissions, selected)
    close(false)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Copy permissions from</DialogTitle>
          <DialogDescription>
            The selected user&apos;s permissions in {branch.name} replace the
            current selection. Nothing is saved until you press Save.
          </DialogDescription>
        </DialogHeader>

        <Command shouldFilter={false} className="rounded-lg! border">
          <CommandInput
            placeholder="ID, name or username"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-72">
            {list.isFetching && candidates.length === 0 ? (
              <div className="flex justify-center p-4">
                <Spinner />
              </div>
            ) : (
              <CommandEmpty>No user found.</CommandEmpty>
            )}
            <CommandGroup>
              {candidates.map((user) => {
                const count = countIn(user, branch.id)
                return (
                  <CommandItem
                    key={user.id}
                    value={String(user.id)}
                    onSelect={() => setSelected(user)}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {user.employee_id} · {user.username}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "ml-auto text-xs tabular-nums",
                        count > 0 ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {count} in {branch.name}
                    </span>
                    <CheckIcon
                      className={cn(
                        "text-success",
                        selected?.id === user.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            disabled={!selected || source.isPending || source.isError}
            onClick={copy}
          >
            {selected && source.isFetching ? <Spinner /> : null}
            {selected ? `Copy from ${selected.name}` : "Copy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
