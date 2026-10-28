import type { Donor } from "@/modules/blood-bank/donors/types"
import type {
  CareType,
  CaseDonorStatus,
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
  transfusion_reason: string | null
  reference_note: string | null
  supplied_at: string | null
  patient: CasePatient | null
  invoice: CaseInvoice | null
  components: CaseComponent[]
  /** Absent on list rows; use `donors_count` there. */
  donors?: CaseDonor[]
  donors_count: number
  created_at: string
}

/** Filters the backend allows on `GET /api/blood-bank/cases`. */
export type CaseFilters = {
  case_no?: string | null
  invoice_no?: string | null
  /** Patient name, phone or patient no (partial). */
  search?: string | null
  status?: CaseStatus | null
  care_type?: CareType | null
  /** `YYYY-MM-DD`, inclusive. */
  registered_from?: string | null
  registered_to?: string | null
}

/** Sorts the backend allows. Column ids in the table use the same names. */
export const caseSortableColumns = ["case_no", "created_at"] as const
