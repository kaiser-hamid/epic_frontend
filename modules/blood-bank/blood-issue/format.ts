import type { Vitals } from "@/modules/blood-bank/blood-issue/types"
import type { Gender } from "@/modules/shared/patient/enums"
import { genderLabels } from "@/modules/shared/patient/enums"

/** "Pulse 80 bpm · BP 120/80 · 98.4 °F". */
export function vitalsText(vitals: Vitals): string {
  return `Pulse ${vitals.pulse_bpm} bpm · BP ${vitals.bp_systolic}/${vitals.bp_diastolic} · ${vitals.temperature_f} °F`
}

/** "32y · Male", or undefined when neither is known. */
export function ageGenderText(person: {
  age: number | null
  gender: Gender | null
}): string | undefined {
  return (
    [
      person.age === null ? null : `${person.age}y`,
      person.gender ? genderLabels[person.gender] : null,
    ]
      .filter(Boolean)
      .join(" · ") || undefined
  )
}

/** "Donor #2 · D000123 · Rahim", for headings and unit rows. */
export function donorTitle(donor: {
  sequence_no: number | null
  number: string | null
  name: string | null
}): string {
  return [
    donor.sequence_no === null ? "Donor" : `Donor #${donor.sequence_no}`,
    donor.number,
    donor.name,
  ]
    .filter(Boolean)
    .join(" · ")
}
