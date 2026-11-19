import type { Donor } from "@/modules/blood-bank/donors/types"
import type {
  CareType,
  CaseDonorStatus,
  CaseService,
  CaseStatus,
} from "@/modules/blood-bank/enums"
import type { BillingStatus } from "@/modules/shared/billing/enums"
import type {
  BloodGroup,
  Gender,
  PatientTitle,
} from "@/modules/shared/patient/enums"

/** Patient summary embedded in a case. */
export type CasePatient = {
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

/** Invoice summary embedded in a case. `amount` is integer paisa. */
export type CaseInvoice = {
  id: number
  invoice_no: string
  amount: number
  status: BillingStatus
  billed_at: string
  is_self_referral: boolean
  referred_by: string | null
}

/** Requested component line. */
export type CaseComponent = {
  component_type_id: number
  code: string
  name: string
  quantity: number
}

/** A donor brought for the case. Only on the detail and create responses. */
export type CaseDonor = {
  id: number
  sequence_no: number
  status: CaseDonorStatus
  billing_id: number | null
  /** The donor's own bill (an added donor); null when registered with the case bill. */
  invoice_no: string | null
  deferral_reason: string | null
  assessed_at: string | null
  donor: Donor
}

/** `CaseResource`. `patient` / `invoice` are null when the linked record is missing. */
export type BloodBankCase = {
  id: number
  case_no: string
  branch_id: number
  status: CaseStatus
  care_type: CareType
  /** The path the case follows, from its bill. */
  service: CaseService
  /** The storage fee was billed: the patient's units wait in storage for a later visit. */
  keeps_units_in_storage: boolean
  transfusion_reason: string | null
  reference_note: string | null
  supplied_at: string | null
  closed_at: string | null
  closed_by: { id: number; name: string } | null
  close_reason: string | null
  /**
   * Case detail only (null on list rows): `can_close` shows "Close case" (open, no unit
   * reserved); `needs_reason` means billed work is outstanding, so a reason is required.
   */
  closing: CaseClosing | null
  patient: CasePatient | null
  invoice: CaseInvoice | null
  components: CaseComponent[]
  /** Absent on list rows; use `donors_count` there. */
  donors?: CaseDonor[]
  donors_count: number
  created_at: string
}

export type CaseClosing = {
  can_close: boolean
  needs_reason: boolean
}

/** Filters the backend allows on `GET /api/blood-bank/cases`. */
export type CaseFilters = {
  case_no?: string | null
  invoice_no?: string | null
  /** Patient name, phone or patient no (partial). */
  search?: string | null
  status?: CaseStatus | null
  care_type?: CareType | null
  service?: CaseService | null
  /** Open cases that never close by themselves (only services billed): `1` to filter. */
  needs_closing?: "1" | null
  /** `YYYY-MM-DD`, inclusive. */
  registered_from?: string | null
  registered_to?: string | null
}

/** Sorts the backend allows. Column ids in the table use the same names. */
export const caseSortableColumns = ["case_no", "created_at"] as const
