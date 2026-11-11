import { notFound } from "next/navigation"

import { parseRouteId } from "@/lib/route-params"
import { SharedPermission } from "@/modules/shared/rbac/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"
import { UserDetailView } from "@/modules/shared/users/components/user-detail"

export default async function UserPage({
  params,
}: PageProps<"/config/users/[userId]">) {
  const userId = parseRouteId((await params).userId)
  if (userId === null) {
    notFound()
  }

  return (
    <RequirePermission permission={SharedPermission.UserView}>
      <UserDetailView userId={userId} />
    </RequirePermission>
  )
}
