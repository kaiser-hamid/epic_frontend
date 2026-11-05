import { TriangleAlertIcon } from "lucide-react"

import { DateTime } from "@/components/date-time"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { unitStatusLabels, type UnitStatus } from "@/modules/blood-bank/enums"
import {
  EXPIRY_WARNING_DAYS,
  isExpiringSoon,
} from "@/modules/blood-bank/units/format"

const variants: Record<
  UnitStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  available: "success",
  reserved: "info",
  issued: "secondary",
  quarantined: "warning",
  discarded: "destructive",
  expired: "destructive",
}

export function UnitStatusBadge({ status }: { status: UnitStatus }) {
  return <Badge variant={variants[status]}>{unitStatusLabels[status]}</Badge>
}

/** The expiry, highlighted when it is within `EXPIRY_WARNING_DAYS` (or past). */
export function UnitExpiry({ expiresAt }: { expiresAt: string }) {
  const soon = isExpiringSoon(expiresAt)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1",
        soon && "font-medium text-destructive"
      )}
      title={soon ? `Expires within ${EXPIRY_WARNING_DAYS} days` : undefined}
    >
      {soon ? <TriangleAlertIcon className="size-3.5" aria-hidden /> : null}
      <DateTime value={expiresAt} />
      {soon ? <span className="sr-only">(expiring soon)</span> : null}
    </span>
  )
}
