import { tz, TZDate } from "@date-fns/tz"
import { format, isValid, parse } from "date-fns"

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

/** Today in Asia/Dhaka as `YYYY-MM-DD`, for date filters. */
export function todayIsoDate(): string {
  return format(inAppTimezone(new Date()), "yyyy-MM-dd")
}

/** ISO 8601 → "27 Oct 2026, 14:05" in Asia/Dhaka. */
export function formatDateTime(value: string | Date): string {
  return format(inAppTimezone(value), "dd MMM yyyy, HH:mm")
}

/** ISO 8601 → "27/10/2026 14:05" in Asia/Dhaka (printed labels). */
export function formatShortDateTime(value: string | Date): string {
  return format(inAppTimezone(value), "dd/MM/yyyy HH:mm")
}

const LOCAL_DATE_TIME = "yyyy-MM-dd'T'HH:mm"

/** Now in Asia/Dhaka as a `datetime-local` input value (`YYYY-MM-DDTHH:mm`). */
export function nowLocalDateTime(): string {
  return format(inAppTimezone(new Date()), LOCAL_DATE_TIME)
}

/**
 * A `datetime-local` input value read as Asia/Dhaka wall time → ISO 8601 (UTC), or null
 * when it is not a full date and time.
 */
export function localDateTimeToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return null
  }
  const date = parse(value, LOCAL_DATE_TIME, new Date(), {
    in: tz(APP_TIMEZONE),
  })
  // A TZDate's own `toISOString` keeps the +06:00 offset; send plain UTC.
  return isValid(date) ? new Date(date.getTime()).toISOString() : null
}
