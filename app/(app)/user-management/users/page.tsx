import { PlusIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Can } from "@/modules/shared/rbac/can"
import { SharedPermission } from "@/modules/shared/rbac/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"
import { UserTable } from "@/modules/user-management/users/components/user-table"

export const metadata: Metadata = { title: "User list" }

export default function UsersPage() {
  return (
    <RequirePermission permission={SharedPermission.UserView}>
      <PageHeader
        title="User list"
        description="Staff accounts, their status and branch permissions."
        actions={
          <Can permission={SharedPermission.UserCreate}>
            <Button asChild>
              <Link href="/user-management/users/new">
                <PlusIcon data-icon="inline-start" />
                New user
              </Link>
            </Button>
          </Can>
        }
      />
      <UserTable />
    </RequirePermission>
  )
}
