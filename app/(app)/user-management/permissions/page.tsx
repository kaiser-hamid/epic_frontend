import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { SharedPermission } from "@/modules/shared/rbac/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"
import { UserAccessTable } from "@/modules/user-management/permissions/components/user-access-table"

export const metadata: Metadata = { title: "Permissions" }

export default function PermissionsPage() {
  return (
    <RequirePermission permission={SharedPermission.UserAssignPermissions}>
      <PageHeader
        title="Permissions"
        description="Who may do what, per branch. Open a user to change their permissions."
      />
      <UserAccessTable />
    </RequirePermission>
  )
}
