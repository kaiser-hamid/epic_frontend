/**
 * Mirrors the backend Shared enums used by patients (and Blood Bank donors). Values must match
 * exactly; labels are UI-only. Update both sides together.
 */

type ValueOf<T> = T[keyof T]

export const PatientTitle = {
  Mr: "mr",
  Mrs: "mrs",
  Miss: "miss",
  Ms: "ms",
  Master: "master",
  Baby: "baby",
  Dr: "dr",
} as const
export type PatientTitle = ValueOf<typeof PatientTitle>

export const patientTitleLabels: Record<PatientTitle, string> = {
  mr: "Mr.",
  mrs: "Mrs.",
  miss: "Miss",
  ms: "Ms.",
  master: "Master",
  baby: "Baby",
  dr: "Dr.",
}

export const Gender = {
  Male: "male",
  Female: "female",
  Other: "other",
} as const
export type Gender = ValueOf<typeof Gender>

export const genderLabels: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
}

export const MaritalStatus = {
  Single: "single",
  Married: "married",
  Divorced: "divorced",
  Widowed: "widowed",
} as const
export type MaritalStatus = ValueOf<typeof MaritalStatus>

export const maritalStatusLabels: Record<MaritalStatus, string> = {
  single: "Single",
  married: "Married",
  divorced: "Divorced",
  widowed: "Widowed",
}

export const BloodGroup = {
  APos: "A_POS",
  ANeg: "A_NEG",
  BPos: "B_POS",
  BNeg: "B_NEG",
  AbPos: "AB_POS",
  AbNeg: "AB_NEG",
  OPos: "O_POS",
  ONeg: "O_NEG",
} as const
export type BloodGroup = ValueOf<typeof BloodGroup>

export const bloodGroupLabels: Record<BloodGroup, string> = {
  A_POS: "A+",
  A_NEG: "A−",
  B_POS: "B+",
  B_NEG: "B−",
  AB_POS: "AB+",
  AB_NEG: "AB−",
  O_POS: "O+",
  O_NEG: "O−",
}
