import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { BloodIssueScreen } from "@/modules/blood-bank/blood-issue/components/blood-issue-screen"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"

export const metadata: Metadata = { title: "Blood Bank blood issue" }

export default function BloodIssuePage() {
  return (
    <RequirePermission permission={BloodBankPermission.IssueView}>
      <PageHeader
        title="Compatibility Test Report"
        description="Record the crossmatch, issue the reserved units to the patient and print the Compatibility Test Report."
      />
      <BloodIssueScreen />
    </RequirePermission>
  )
}
