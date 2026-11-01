import type { CaseInvoice, CasePatient } from "@/modules/blood-bank/cases/types"
import type { CareType, ExaminationDecision } from "@/modules/blood-bank/enums"
import type {
  SampleCollectionCase,
  SampleSubjectInfo,
} from "@/modules/blood-bank/samples/types"

export type StaffRef = { id: number; name: string }

/** A saved physical examination (`DonorExaminationResource`). Measurements are JSON numbers. */
export type PhysicalExamination = {
  weight_kg: number
  height_cm: number | null
  hemoglobin_g_dl: number
  pulse_bpm: number
  bp_systolic: number
  bp_diastolic: number
  temperature_f: number
  examined_at: string
  examined_by: StaffRef | null
}

/**
 * One donor row. `decision` is `accepted` (status `fit` or later), `deferred`, or null before
 * the exam; a later serology deferral also reads `deferred`, `case_donor_status` tells them apart.
 * The form can be saved only while `can_examine`.
 */
export type ExaminationDonor = SampleSubjectInfo & {
  decision: ExaminationDecision | null
  deferral_reason: string | null
  assessed_at: string | null
  assessed_by: StaffRef | null
  examination: PhysicalExamination | null
  can_examine: boolean
}

/** `DonorExaminationResource`: the information panel and one row per case donor in sequence order. */
export type DonorExamination = {
  case: SampleCollectionCase
  patient: CasePatient | null
  invoice: CaseInvoice | null
  donors: ExaminationDonor[]
}

/** Body of `PUT /cases/{id}/donors/{caseDonorId}/physical-examination`. */
export type PhysicalExaminationInput = {
  weight_kg: number
  height_cm: number | null
  hemoglobin_g_dl: number
  pulse_bpm: number
  bp_systolic: number
  bp_diastolic: number
  temperature_f: number
  decision: ExaminationDecision
  /** Only with a deferral. */
  deferral_reason?: string
}

/** Filters the backend allows on `GET /api/blood-bank/donor-examination/pending`. */
export type PendingExaminationFilters = {
  care_type?: CareType | null
}

/** Sorts the backend allows on the pending list. */
export const pendingExaminationSortableColumns = [
  "case_no",
  "created_at",
] as const
