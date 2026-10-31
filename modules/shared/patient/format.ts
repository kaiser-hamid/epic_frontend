type PatientAge = {
  age_years: number | null
  age_months: number | null
  age_days: number | null
}

/** "40y 2m 10d", leaving out empty parts; null when no age is known. */
export function formatPatientAge(patient: PatientAge): string | null {
  const parts = [
    patient.age_years ? `${patient.age_years}y` : null,
    patient.age_months ? `${patient.age_months}m` : null,
    patient.age_days ? `${patient.age_days}d` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : null
}
