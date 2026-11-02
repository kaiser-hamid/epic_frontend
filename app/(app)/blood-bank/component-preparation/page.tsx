import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { ComponentPreparationScreen } from "@/modules/blood-bank/units/components/component-preparation-screen"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"

export const metadata: Metadata = { title: "Blood Bank component preparation" }

export default function ComponentPreparationPage() {
  return (
    <RequirePermission permission={BloodBankPermission.UnitView}>
      <PageHeader
        title="Component Preparation"
        description="Keep a bag as whole blood or separate it into components, store the units and print their labels."
      />
      <ComponentPreparationScreen />
    </RequirePermission>
  )
}
