import type { Metadata } from "next"

import { PageHeader } from "@/components/page-header"
import { BloodCollectionScreen } from "@/modules/blood-bank/blood-collections/components/blood-collection-screen"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"

export const metadata: Metadata = { title: "Blood Bank blood collection" }

export default function BloodCollectionPage() {
  return (
    <RequirePermission permission={BloodBankPermission.CollectionView}>
      <PageHeader
        title="Blood Collection"
        description="Collect blood from eligible donors into bags and print the bag labels."
      />
      <BloodCollectionScreen />
    </RequirePermission>
  )
}
