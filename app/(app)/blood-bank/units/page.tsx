import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { UnitLabelPrinter } from "@/modules/blood-bank/units/components/unit-label-printer"
import { UnitTable } from "@/modules/blood-bank/units/components/unit-table"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"

export const metadata: Metadata = { title: "Blood Bank units" }

export default function UnitsPage() {
  return (
    <RequirePermission permission={BloodBankPermission.UnitView}>
      <PageHeader
        title="Units"
        description="Blood units made at collection: reserved for patients or in stock. Find a unit and reprint its label."
      />
      <UnitLabelPrinter>
        <UnitTable />
      </UnitLabelPrinter>
    </RequirePermission>
  )
}
