import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { AddDonorScreen } from "@/modules/blood-bank/case-donors/components/add-donor-screen"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"

export const metadata: Metadata = { title: "Add donor" }

export default function AddDonorPage() {
  return (
    <RequirePermission permission={BloodBankPermission.CaseCreate}>
      <PageHeader
        title="Add donor"
        description="Add a replacement or one more donor to an open case, billed on its own invoice."
      />
      <AddDonorScreen />
    </RequirePermission>
  )
}
