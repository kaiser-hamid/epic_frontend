import { notFound } from "next/navigation"

import { PageHeader } from "@/components/page-header"
import { parseRouteId } from "@/lib/route-params"
import { CaseEditForm } from "@/modules/blood-bank/cases/components/case-edit-form"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"

export default async function EditCasePage({
  params,
}: PageProps<"/blood-bank/cases/[caseId]/edit">) {
  const caseId = parseRouteId((await params).caseId)
  if (caseId === null) {
    notFound()
  }

  return (
    <RequirePermission permission={BloodBankPermission.CaseUpdate}>
      <PageHeader title="Edit case" />
      <CaseEditForm caseId={caseId} />
    </RequirePermission>
  )
}
