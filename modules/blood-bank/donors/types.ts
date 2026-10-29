import type {
  CareType,
  CaseDonorStatus,
  CaseStatus,
  CollectionStatus,
} from "@/modules/blood-bank/enums"
import type {
  BloodGroup,
  Gender,
  PatientTitle,
} from "@/modules/shared/patient/enums"

/** `bb_donors` as returned by `DonorResource`. */
export type Donor = {
  id: number
  donor_no: string
  name: string
  age: number | null
  date_of_birth: string | null
  gender: Gender | null
  blood_group: BloodGroup | null
  phone: string | null
  address: string | null
  national_id: string | null
  is_regular_volunteer: boolean | null
  created_at: string
}

/** Filters the backend allows on `GET /api/blood-bank/donors`. */
export type DonorFilters = {
  /** Donor no, name, phone or national id (partial, any case). */
  search?: string | null
  donor_no?: string | null
  phone?: string | null
}

/** Sorts the backend allows. Column ids in the table use the same names. */
export const donorSortableColumns = ["name", "created_at"] as const

/** Patient a donation was for (`patient` is null if the record is missing). */
export type DonationPatient = {
  id: number
  patient_no: string
  title: PatientTitle | null
  name: string
  age_years: number | null
  age_months: number | null
  age_days: number | null
  date_of_birth: string | null
  gender: Gender | null
  blood_group: BloodGroup | null
  phone: string | null
  address: string | null
}

export type DonationCollection = {
  id: number
  bag_no: string
  volume_ml: number | null
  status: CollectionStatus
  collected_at: string | null
}

/** One case the donor was registered for, across all branches. */
export type Donation = {
  case_donor_id: number
  /** 2 or more: a replacement donor. */
  sequence_no: number
  status: CaseDonorStatus
  deferral_reason: string | null
  assessed_at: string | null
  registered_at: string
  case: {
    id: number
    case_no: string
    /** May differ from the session branch. */
    branch_id: number
    status: CaseStatus
    care_type: CareType
    transfusion_reason: string | null
  }
  patient: DonationPatient | null
  /** Usually 0 or 1; empty unless the status is collected. */
  collections: DonationCollection[]
}

/** `GET /api/blood-bank/donors/{id}`: the donor plus donation history, newest first. */
export type DonorDetail = Donor & { donations: Donation[] }
