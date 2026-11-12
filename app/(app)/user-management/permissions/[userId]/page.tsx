import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { parseRouteId } from "@/lib/route-params"
import { SharedPermission } from "@/modules/shared/rbac/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"
import { UserGrantsView } from "@/modules/user-management/permissions/components/user-grants-view"

export const metadata: Metadata = { title: "User permissions" }

export default async function UserGrantsPage({
  params,
}: PageProps<"/user-management/permissions/[userId]">) {
  const userId = parseRouteId((await params).userId)
  if (userId === null) {
    notFound()
  }

  // Assigning needs both: the account itself (`sh.user.view`) and the right to change grants.
  return (
    <RequirePermission permission={SharedPermission.UserAssignPermissions}>
      <RequirePermission permission={SharedPermission.UserView}>
        <UserGrantsView userId={userId} />
      </RequirePermission>
    </RequirePermission>
  )
}
