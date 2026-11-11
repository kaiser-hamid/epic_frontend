"use client"

import { PlusIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { SharedPermission } from "@/modules/shared/rbac/permissions"
import { useCan } from "@/modules/shared/rbac/use-can"
import { CreateUserDialog } from "@/modules/shared/users/components/user-form-dialog"

export function NewUserButton() {
  const canCreate = useCan(SharedPermission.UserCreate)
  const [open, setOpen] = useState(false)

  if (!canCreate) {
    return null
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon data-icon="inline-start" />
        New user
      </Button>
      <CreateUserDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
