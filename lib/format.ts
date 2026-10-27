import { TZDate } from "@date-fns/tz"
import { format } from "date-fns"

export const APP_TIMEZONE = "Asia/Dhaka"

const groupFormatter = new Intl.NumberFormat("en-IN")

/**
 * Integer paisa → "৳1,23,456.50". Integer math only; never converts money to a float.
 */
export function formatTaka(paisa: number): string {
  if (!Number.isSafeInteger(paisa)) {
    throw new Error(`Money must be integer paisa, got ${paisa}`)
  }

  const sign = paisa < 0 ? "-" : ""
  const absolute = Math.abs(paisa)
  const taka = Math.trunc(absolute / 100)
  const remainder = String(absolute % 100).padStart(2, "0")

  return `${sign}৳${groupFormatter.format(taka)}.${remainder}`
}

function inAppTimezone(value: string | Date): TZDate {
  return new TZDate(new Date(value), APP_TIMEZONE)
}

/** ISO 8601 → "27 Oct 2026" in Asia/Dhaka. */
export function formatDate(value: string | Date): string {
  return format(inAppTimezone(value), "dd MMM yyyy")
}

/** ISO 8601 → "27 Oct 2026, 14:05" in Asia/Dhaka. */
export function formatDateTime(value: string | Date): string {
  return format(inAppTimezone(value), "dd MMM yyyy, HH:mm")
}
