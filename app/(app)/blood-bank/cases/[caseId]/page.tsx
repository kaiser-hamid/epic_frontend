import { notFound } from "next/navigation"

import { CaseDetail } from "@/modules/blood-bank/cases/components/case-detail"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"
import { parseRouteId } from "@/lib/route-params"

export default async function CasePage({
  params,
}: PageProps<"/blood-bank/cases/[caseId]">) {
  const caseId = parseRouteId((await params).caseId)
  if (caseId === null) {
    notFound()
  }

  return (
    <RequirePermission permission={BloodBankPermission.CaseView}>
      <CaseDetail caseId={caseId} />
    </RequirePermission>
  )
}
