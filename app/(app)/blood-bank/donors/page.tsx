import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { DonorTable } from "@/modules/blood-bank/donors/components/donor-table"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"

export const metadata: Metadata = { title: "Blood Bank donors" }

export default function DonorsPage() {
  return (
    <RequirePermission permission={BloodBankPermission.DonorView}>
      <PageHeader
        title="Donors"
        description="Registered donors of all branches."
      />
      <DonorTable />
    </RequirePermission>
  )
}
