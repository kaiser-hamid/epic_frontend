import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { SharedPermission } from "@/modules/shared/rbac/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"
import { NewUserButton } from "@/modules/shared/users/components/new-user-button"
import { UserTable } from "@/modules/shared/users/components/user-table"

export const metadata: Metadata = { title: "User Management" }

export default function UsersPage() {
  return (
    <RequirePermission permission={SharedPermission.UserView}>
      <PageHeader
        title="User Management"
        description="Staff accounts, their status and branch permissions."
        actions={<NewUserButton />}
      />
      <UserTable />
    </RequirePermission>
  )
}
