import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { DonorSerologyScreen } from "@/modules/blood-bank/donor-serology/components/donor-serology-screen"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"

export const metadata: Metadata = { title: "Blood Bank donor serology" }

export default function DonorSerologyPage() {
  return (
    <RequirePermission permission={BloodBankPermission.SerologyView}>
      <PageHeader
        title="Donor Serology"
        description="Record each donor's blood group and screening results and accept or defer them."
      />
      <DonorSerologyScreen />
    </RequirePermission>
  )
}
