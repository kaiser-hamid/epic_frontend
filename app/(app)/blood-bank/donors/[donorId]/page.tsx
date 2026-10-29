import { notFound } from "next/navigation"

import { parseRouteId } from "@/lib/route-params"
import { DonorDetailView } from "@/modules/blood-bank/donors/components/donor-detail"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"

export default async function DonorPage({
  params,
}: PageProps<"/blood-bank/donors/[donorId]">) {
  const donorId = parseRouteId((await params).donorId)
  if (donorId === null) {
    notFound()
  }

  return (
    <RequirePermission permission={BloodBankPermission.DonorView}>
      <DonorDetailView donorId={donorId} />
    </RequirePermission>
  )
}
