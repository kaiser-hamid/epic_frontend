import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { SampleCollectionScreen } from "@/modules/blood-bank/samples/components/sample-collection-screen"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"

export const metadata: Metadata = { title: "Blood Bank sample collection" }

export default function SampleCollectionPage() {
  return (
    <RequirePermission permission={BloodBankPermission.SampleView}>
      <PageHeader
        title="Sample Collection"
        description="Collect patient and donor samples and print their labels."
      />
      <SampleCollectionScreen />
    </RequirePermission>
  )
}
