import { Badge } from "@/components/ui/badge"
import { caseStatusLabels, type CaseStatus } from "@/modules/blood-bank/enums"

const variants: Record<
  CaseStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  open: "default",
  closed: "secondary",
  cancelled: "destructive",
}

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return <Badge variant={variants[status]}>{caseStatusLabels[status]}</Badge>
}
