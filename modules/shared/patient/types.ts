import type {
  BloodGroup,
  Gender,
  MaritalStatus,
  PatientTitle,
} from "@/modules/shared/patient/enums"

/** `sh_patient_master` as returned by `PatientResource`. */
export type Patient = {
  id: number
  patient_no: string
  title: PatientTitle | null
  name: string
  address: string | null
  age_years: number | null
  age_months: number | null
  age_days: number | null
  /** `YYYY-MM-DD`; back-calculated from the age when not given. */
  date_of_birth: string | null
  gender: Gender | null
  marital_status: MaritalStatus | null
  blood_group: BloodGroup | null
  phone: string | null
  national_id: string | null
  created_at: string
}
