import { Badge } from "@/components/ui/badge"
import {
  caseDonorStatusLabels,
  type CaseDonorStatus,
} from "@/modules/blood-bank/enums"

const statuses: Record<
  CaseDonorStatus,
  { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  registered: { label: "Awaiting exam", variant: "warning" },
  fit: { label: "Accepted", variant: "info" },
  eligible: { label: caseDonorStatusLabels.eligible, variant: "secondary" },
  deferred: { label: "Deferred", variant: "destructive" },
  collected: { label: caseDonorStatusLabels.collected, variant: "success" },
}

/** A donor's progress as the physician sees it on the examination screen. */
export function ExaminationStatusBadge({
  status,
}: {
  status: CaseDonorStatus
}) {
  const { label, variant } = statuses[status]
  return <Badge variant={variant}>{label}</Badge>
}
