import { Badge } from "@/components/ui/badge"
import {
  sampleStatusLabels,
  type SampleStatus,
} from "@/modules/blood-bank/enums"

const variants: Record<
  SampleStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  collected: "secondary",
  in_testing: "outline",
  tested: "default",
  rejected: "destructive",
}

export function SampleStatusBadge({ status }: { status: SampleStatus }) {
  return <Badge variant={variants[status]}>{sampleStatusLabels[status]}</Badge>
}
