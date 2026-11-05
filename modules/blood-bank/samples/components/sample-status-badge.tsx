import { Badge } from "@/components/ui/badge"
import {
  sampleStatusLabels,
  type SampleStatus,
} from "@/modules/blood-bank/enums"

const variants: Record<
  SampleStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  collected: "success",
  in_testing: "info",
  tested: "success",
  rejected: "destructive",
}

export function SampleStatusBadge({ status }: { status: SampleStatus }) {
  return <Badge variant={variants[status]}>{sampleStatusLabels[status]}</Badge>
}
