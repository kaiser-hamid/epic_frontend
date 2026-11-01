import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { DonorExaminationScreen } from "@/modules/blood-bank/donor-examinations/components/donor-examination-screen"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"

export const metadata: Metadata = { title: "Blood Bank donor examination" }

export default function DonorExaminationPage() {
  return (
    <RequirePermission permission={BloodBankPermission.DonorExamView}>
      <PageHeader
        title="Donor Examination"
        description="Record each donor's physical examination and accept or defer them."
      />
      <DonorExaminationScreen />
    </RequirePermission>
  )
}
