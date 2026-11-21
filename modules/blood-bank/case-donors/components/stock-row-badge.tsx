import { PackageIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  CaseDonorSource,
  caseDonorSourceLabels,
} from "@/modules/blood-bank/enums"

/**
 * "Stock bag" on a case donor row that is a stock unit standing in for a donor (its person is
 * the bag's original donor). Renders nothing for a real donor.
 */
export function StockRowBadge({ source }: { source: CaseDonorSource }) {
  if (source !== CaseDonorSource.Stock) {
    return null
  }

  return (
    <Badge variant="info">
      <PackageIcon data-icon="inline-start" />
      {caseDonorSourceLabels.stock}
    </Badge>
  )
}
