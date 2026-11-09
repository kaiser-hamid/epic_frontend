import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { AddDonorScreen } from "@/modules/blood-bank/case-donors/components/add-donor-screen"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"

export const metadata: Metadata = { title: "Add donor" }

export default function AddDonorPage() {
  return (
    <RequirePermission permission={BloodBankPermission.CaseUpdate}>
      <PageHeader
        title="Add donor"
        description="Add a donor to an open case under a bill already saved for the patient (the case bill, or e.g. an additional donor charge bill)."
      />
      <AddDonorScreen />
    </RequirePermission>
  )
}
