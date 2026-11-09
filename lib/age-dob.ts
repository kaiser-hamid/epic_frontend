import { format, intervalToDuration, isValid, parse, sub } from "date-fns"

import { todayIsoDate } from "@/lib/format"

/**
 * Age and date of birth stand in for each other on the registration forms: typing an age fills the
 * date of birth, picking a date of birth fills the age. Both use calendar arithmetic against
 * today (Asia/Dhaka); the backend still owns the final values.
 */

const DATE_FORMAT = "yyyy-MM-dd"
const MIN_YEAR = 1900

export type Age = {
  years: number | undefined
  months: number | undefined
  days: number | undefined
}

function toDate(value: string): Date | null {
  const date = parse(value, DATE_FORMAT, new Date())
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(date) ? date : null
}

/**
 * `YYYY-MM-DD` that is `years`, `years + months` or `years + months + days` before today.
 * "" when no part is given. Missing parts count as zero.
 */
export function dobFromAge(age: Partial<Age>, today = todayIsoDate()): string {
  if (
    age.years === undefined &&
    age.months === undefined &&
    age.days === undefined
  ) {
    return ""
  }
  const base = toDate(today)
  if (!base) {
    return ""
  }
  return format(
    sub(base, {
      years: age.years ?? 0,
      months: age.months ?? 0,
      days: age.days ?? 0,
    }),
    DATE_FORMAT
  )
}

/** Whole years, months and days from `dob` to today; null for an incomplete, future or implausible date. */
export function ageFromDob(
  dob: string,
  today = todayIsoDate()
): { years: number; months: number; days: number } | null {
  const start = toDate(dob)
  const end = toDate(today)
  if (!start || !end || start > end || start.getFullYear() < MIN_YEAR) {
    return null
  }
  const duration = intervalToDuration({ start, end })
  return {
    years: duration.years ?? 0,
    months: duration.months ?? 0,
    days: duration.days ?? 0,
  }
}
