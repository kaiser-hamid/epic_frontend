import { formatDate, formatDateTime } from "@/lib/format"

/** Displays an ISO 8601 value in Asia/Dhaka. Renders an em dash for null. */
export function DateTime({
  value,
  dateOnly = false,
  className,
}: {
  value: string | null | undefined
  dateOnly?: boolean
  className?: string
}) {
  if (!value) {
    return <span className={className}>—</span>
  }

  return (
    <time dateTime={value} className={className}>
      {dateOnly ? formatDate(value) : formatDateTime(value)}
    </time>
  )
}
