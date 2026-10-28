import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { CaseCreateForm } from "@/modules/blood-bank/cases/components/case-create-form"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"

export const metadata: Metadata = { title: "New case" }

export default function NewCasePage() {
  return (
    <RequirePermission permission={BloodBankPermission.CaseCreate}>
      <PageHeader
        title="New case"
        description="Register the patient, bill, requested components and donors in one save."
      />
      <CaseCreateForm />
    </RequirePermission>
  )
}
