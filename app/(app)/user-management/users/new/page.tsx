import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { SharedPermission } from "@/modules/shared/rbac/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"
import { CreateUserForm } from "@/modules/user-management/users/components/user-form"

export const metadata: Metadata = { title: "New user" }

export default function NewUserPage() {
  return (
    <RequirePermission permission={SharedPermission.UserCreate}>
      <PageHeader
        title="New user"
        description="The employee ID is assigned automatically. The user must change this password on first sign-in."
      />
      <CreateUserForm />
    </RequirePermission>
  )
}
