/**
 * Mirrors the backend `Modules\Shared\Auth\Enums\Designation`. Values must match exactly;
 * labels are UI-only. Update both sides together.
 */
export const Designation = {
  Receptionist: "receptionist",
  Cashier: "cashier",
  LabTechnician: "lab_technician",
  MedicalTechnologist: "medical_technologist",
  BloodBankTechnician: "blood_bank_technician",
  Phlebotomist: "phlebotomist",
  Pathologist: "pathologist",
  MedicalOfficer: "medical_officer",
  Nurse: "nurse",
  LabManager: "lab_manager",
} as const

export type Designation = (typeof Designation)[keyof typeof Designation]

export const designationLabels: Record<Designation, string> = {
  receptionist: "Receptionist",
  cashier: "Cashier",
  lab_technician: "Lab Technician",
  medical_technologist: "Medical Technologist",
  blood_bank_technician: "Blood Bank Technician",
  phlebotomist: "Phlebotomist",
  pathologist: "Pathologist",
  medical_officer: "Medical Officer",
  nurse: "Nurse",
  lab_manager: "Lab Manager",
}

/** Display text for a designation from the API, or null when not set. */
export function designationLabel(
  designation: Designation | null | undefined
): string | null {
  return designation ? designationLabels[designation] : null
}
