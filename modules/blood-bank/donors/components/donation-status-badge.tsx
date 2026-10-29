import { Badge } from "@/components/ui/badge"
import type { CaseDonorStatus } from "@/modules/blood-bank/enums"

const donationStatus: Record<
  CaseDonorStatus,
  { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  registered: { label: "Pending assessment", variant: "outline" },
  eligible: { label: "Accepted", variant: "secondary" },
  deferred: { label: "Deferred", variant: "destructive" },
  collected: { label: "Donated", variant: "default" },
}

/** The donor's outcome on one case. */
export function DonationStatusBadge({ status }: { status: CaseDonorStatus }) {
  const { label, variant } = donationStatus[status]
  return <Badge variant={variant}>{label}</Badge>
}
