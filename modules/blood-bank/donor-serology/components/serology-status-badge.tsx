import { Badge } from "@/components/ui/badge"
import type { CaseDonorStatus } from "@/modules/blood-bank/enums"

const statuses: Record<
  CaseDonorStatus,
  { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  registered: { label: "Awaiting exam", variant: "outline" },
  fit: { label: "Awaiting serology", variant: "outline" },
  eligible: { label: "Accepted", variant: "default" },
  deferred: { label: "Deferred", variant: "destructive" },
  collected: { label: "Bag collected", variant: "secondary" },
}

/** A donor's progress as the serology screen sees it. */
export function SerologyStatusBadge({ status }: { status: CaseDonorStatus }) {
  const { label, variant } = statuses[status]
  return <Badge variant={variant}>{label}</Badge>
}
