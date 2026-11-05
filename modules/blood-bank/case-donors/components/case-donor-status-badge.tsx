import { Badge } from "@/components/ui/badge"
import {
  caseDonorStatusLabels,
  type CaseDonorStatus,
} from "@/modules/blood-bank/enums"

const variants: Record<
  CaseDonorStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  registered: "outline",
  fit: "secondary",
  eligible: "secondary",
  deferred: "destructive",
  collected: "success",
}

export function CaseDonorStatusBadge({ status }: { status: CaseDonorStatus }) {
  return (
    <Badge variant={variants[status]}>{caseDonorStatusLabels[status]}</Badge>
  )
}
