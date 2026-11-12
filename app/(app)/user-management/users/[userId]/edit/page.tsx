import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { parseRouteId } from "@/lib/route-params"
import { SharedPermission } from "@/modules/shared/rbac/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"
import { EditUserView } from "@/modules/user-management/users/components/edit-user-view"

export const metadata: Metadata = { title: "Edit user" }

export default async function EditUserPage({
  params,
}: PageProps<"/user-management/users/[userId]/edit">) {
  const userId = parseRouteId((await params).userId)
  if (userId === null) {
    notFound()
  }

  return (
    <RequirePermission permission={SharedPermission.UserUpdate}>
      <EditUserView userId={userId} />
    </RequirePermission>
  )
}
