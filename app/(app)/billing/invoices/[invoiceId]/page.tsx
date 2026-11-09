import { notFound } from "next/navigation"

import { parseRouteId } from "@/lib/route-params"
import { InvoiceDetail } from "@/modules/shared/billing/invoices/components/invoice-detail"
import { SharedPermission } from "@/modules/shared/rbac/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"

export default async function InvoicePage({
  params,
}: PageProps<"/billing/invoices/[invoiceId]">) {
  const invoiceId = parseRouteId((await params).invoiceId)
  if (invoiceId === null) {
    notFound()
  }

  return (
    <RequirePermission permission={SharedPermission.BillingView}>
      <InvoiceDetail invoiceId={invoiceId} />
    </RequirePermission>
  )
}
