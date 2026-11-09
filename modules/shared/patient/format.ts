type PatientAge = {
  age_years: number | null
  age_months: number | null
  age_days: number | null
}

/**
 * The one way an age is shown anywhere: only its largest unit. Years when there are any ("78Y"),
 * else months ("5M"), else days ("22D"); a known age of nothing at all is "0D"; null when no age
 * is known. Same rule as the backend's `AgeLabel` (labels, reports, bills, `age_label`).
 */
export function formatAge(
  years: number | null | undefined,
  months?: number | null,
  days?: number | null
): string | null {
  if (years) return `${years}Y`
  if (months) return `${months}M`
  if (days) return `${days}D`
  return years == null && months == null && days == null ? null : "0D"
}

/** The patient's age as shown everywhere ("78Y", "5M", "22D"); see `formatAge`. */
export function formatPatientAge(patient: PatientAge): string | null {
  return formatAge(patient.age_years, patient.age_months, patient.age_days)
}
