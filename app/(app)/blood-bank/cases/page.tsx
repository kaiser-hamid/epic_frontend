import { PlusIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { CaseTable } from "@/modules/blood-bank/cases/components/case-table"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { Can } from "@/modules/shared/rbac/can"
import { RequirePermission } from "@/modules/shared/rbac/require-permission"

export const metadata: Metadata = { title: "Blood Bank cases" }

export default function CasesPage() {
  return (
    <RequirePermission permission={BloodBankPermission.CaseView}>
      <PageHeader
        title="Cases"
        description="Patient blood requests for this branch."
        actions={
          <Can permission={BloodBankPermission.CaseCreate}>
            <Button asChild>
              <Link href="/blood-bank/cases/new">
                <PlusIcon data-icon="inline-start" />
                New case
              </Link>
            </Button>
          </Can>
        }
      />
      <CaseTable />
    </RequirePermission>
  )
}
