import type {
  CaseComponent,
  CaseInvoice,
  CasePatient,
} from "@/modules/blood-bank/cases/types"
import type { StaffRef } from "@/modules/blood-bank/donor-examinations/types"
import type { ScreeningTest } from "@/modules/blood-bank/donor-serology/types"
import type {
  CareType,
  CollectionStatus,
  CrossmatchResult,
  ResultStatus,
  SampleStatus,
  ScreeningResult,
} from "@/modules/blood-bank/enums"
import type {
  SampleCollectionCase,
  SampleSubjectInfo,
} from "@/modules/blood-bank/samples/types"
import type { Unit } from "@/modules/blood-bank/units/types"
import type { BloodGroup } from "@/modules/shared/patient/enums"

/**
 * A billed component line: units reserved for the patient, issued, and still to issue
 * (`remaining_count` = billed − issued, never below 0). The case closes when every line is 0.
 */
export type IssueComponent = CaseComponent & {
  reserved_count: number
  issued_count: number
  remaining_count: number
}

export type BloodIssueCase = Omit<SampleCollectionCase, "components"> & {
  /** "Supply time": the latest issue; null until blood is issued. */
  supplied_at: string | null
  components: IssueComponent[]
}

/** The current blood group result on the patient sample; `version` above 1 means amended. */
export type PatientBloodGroup = {
  value: BloodGroup
  version: number
  tested_at: string
  tested_by: StaffRef | null
}

/** The latest non-rejected patient sample; null until it is drawn. */
export type IssuePatientSample = {
  id: number
  sample_no: string
  status: SampleStatus
  collected_at: string
  blood_group: PatientBloodGroup | null
}

export type Vitals = {
  pulse_bpm: number
  bp_systolic: number
  bp_diastolic: number
  temperature_f: number
}

export type PostDonationVitals = Vitals & {
  recorded_at: string
  recorded_by: StaffRef | null
}

/** The donor's physical examination: pre-donation vitals, and post-donation ones once recorded. */
export type IssueExamination = {
  weight_kg: number
  height_cm: number | null
  hemoglobin_g_dl: number
  pre: Vitals
  examined_at: string
  examined_by: StaffRef | null
  post: PostDonationVitals | null
}

/** The current serology results on the donor sample (a test not entered yet is null). */
export type IssueSerology = Record<ScreeningTest, ScreeningResult | null> & {
  sample_no: string
  blood_group: BloodGroup | null
  version: number
  tested_at: string
  tested_by: StaffRef | null
}

export type IssueBag = {
  id: number
  bag_no: string
  status: CollectionStatus
  volume_ml: number
  collected_at: string
  collected_by: StaffRef | null
}

/**
 * One case donor, in sequence order (`number` is the donor no). `invoice_no` is an added donor's own bill.
 * `needs_post_vitals`: the Issue form must send this donor's post-donation vitals when one of
 * their units is issued.
 */
export type IssueDonor = SampleSubjectInfo & {
  invoice_no: string | null
  deferral_reason: string | null
  assessed_at: string | null
  assessed_by: StaffRef | null
  examination: IssueExamination | null
  serology: IssueSerology | null
  bag: IssueBag | null
  needs_post_vitals: boolean
}

/** The unit's current crossmatch with the patient sample (the Compatibility Test Report). */
export type Crossmatch = {
  id: number
  version: number
  major_result: CrossmatchResult
  minor_result: CrossmatchResult
  is_compatible: boolean
  remarks: string | null
  status: ResultStatus
  tested_at: string
  tested_by: StaffRef | null
  reviewed_at: string | null
  reviewed_by: StaffRef | null
}

/**
 * A unit reserved for or issued to the case. `crossmatch` is null until issued; it can be
 * issued now while `can_issue`.
 */
export type IssueUnit = Unit & {
  crossmatch: Crossmatch | null
  compatibility_report_print_count: number
  can_issue: boolean
}

/**
 * `BloodIssueResource`: everything about the case. "Issue Blood" is enabled while
 * `can_issue` (a patient sample exists and some unit can be issued).
 */
export type BloodIssue = {
  case: BloodIssueCase
  patient: CasePatient | null
  invoice: CaseInvoice | null
  patient_sample: IssuePatientSample | null
  donors: IssueDonor[]
  units: IssueUnit[]
  can_issue: boolean
}

/** Exactly one of them is sent to `GET /blood-issue`. */
export type BloodIssueLookup = { invoice_no: string } | { donor_no: string }

/** One unit row of `POST /cases/{id}/blood-issue`. */
export type CrossmatchUnitInput = {
  unit_id: number
  major_result: CrossmatchResult
  minor_result: CrossmatchResult
  remarks: string | null
}

/** One donor's post-donation vitals in `POST /cases/{id}/blood-issue`. */
export type PostDonationInput = Vitals & { case_donor_id: number }

/** Body of `POST /cases/{id}/blood-issue`. */
export type IssueBloodInput = {
  technologist_id: number
  physician_id: number
  /** Null when unchanged and already recorded. */
  patient_blood_group: BloodGroup | null
  amendment_reason: string | null
  units: CrossmatchUnitInput[]
  post_donation: PostDonationInput[]
}

/** Body of `POST /cases/{id}/compatibility-reports`. */
export type PrintCompatibilityReportsInput = {
  unit_ids: number[]
  reprint_reason: string | null
}

/** A PDF answer: the file and its name from `Content-Disposition`. */
export type PdfFile = {
  blob: Blob
  filename: string
}

/** Filters the backend allows on `GET /api/blood-bank/blood-issue/pending`. */
export type PendingBloodIssueFilters = {
  care_type?: CareType | null
}

/** Sorts the backend allows on the pending list. */
export const pendingBloodIssueSortableColumns = [
  "case_no",
  "created_at",
] as const
