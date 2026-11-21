import { PackageIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { CaseDonorSource } from "@/modules/blood-bank/enums"
import type { SampleSubjectInfo } from "@/modules/blood-bank/samples/types"
import { UnitStatusBadge } from "@/modules/blood-bank/units/components/unit-status-badge"

/**
 * Marks a donor row that is a stock bag standing in for a donor: its unit no and component,
 * and (with `showStatus`) the unit's status (held, for patient, issued…). Renders nothing for a
 * real donor or the patient.
 */
export function StockUnitTag({
  subject,
  showStatus = false,
}: {
  subject: Pick<SampleSubjectInfo, "source" | "stock_unit">
  showStatus?: boolean
}) {
  const unit = subject.stock_unit
  if (subject.source !== CaseDonorSource.Stock || unit === null) {
    return null
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge variant="info">
        <PackageIcon data-icon="inline-start" />
        Stock bag {unit.unit_no}
        <span className="sr-only">, component</span> · {unit.component.code}
      </Badge>
      {showStatus ? <UnitStatusBadge status={unit.status} /> : null}
    </span>
  )
}
