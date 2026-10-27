import { formatTaka } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Displays integer paisa as Taka. The only place money is formatted for display. */
export function Money({
  paisa,
  className,
}: {
  paisa: number
  className?: string
}) {
  return (
    <span className={cn("tabular-nums", className)}>{formatTaka(paisa)}</span>
  )
}
