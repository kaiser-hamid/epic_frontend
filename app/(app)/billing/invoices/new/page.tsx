import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { CareOfField } from "@/modules/blood-bank/cases/components/care-of-field"
import { InvoiceForm } from "@/modules/shared/billing/invoices/components/invoice-form"
import { SharedPermission } from "@/modules/shared/rbac/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"
import { TestItemCategory } from "@/modules/shared/test-catalog/enums"

export const metadata: Metadata = { title: "New bill" }

/** Each kind of bill's own fields, from the module that owns it (composed here, in `app/`). */
const categoryDetails = {
  [TestItemCategory.BloodBank]: (
    <CareOfField name="category_details.care_type" />
  ),
}

export default function NewInvoicePage() {
  return (
    <RequirePermission permission={SharedPermission.BillingCreate}>
      <PageHeader
        title="New Bill Entry"
        description="Register the patient and bill the tests. A Blood Bank bill also opens its Blood Bank case."
      />
      <InvoiceForm categoryDetails={categoryDetails} />
    </RequirePermission>
  )
}
