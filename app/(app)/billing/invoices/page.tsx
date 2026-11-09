import { PlusIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { InvoiceTable } from "@/modules/shared/billing/invoices/components/invoice-table"
import { Can } from "@/modules/shared/rbac/can"
import { SharedPermission } from "@/modules/shared/rbac/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"

export const metadata: Metadata = { title: "Invoice list" }

export default function InvoicesPage() {
  return (
    <RequirePermission permission={SharedPermission.BillingView}>
      <PageHeader
        title="Invoice list"
        description="Invoices of this branch."
        actions={
          <Can permission={SharedPermission.BillingCreate}>
            <Button asChild>
              <Link href="/billing/invoices/new">
                <PlusIcon data-icon="inline-start" />
                New invoice
              </Link>
            </Button>
          </Can>
        }
      />
      <InvoiceTable />
    </RequirePermission>
  )
}
