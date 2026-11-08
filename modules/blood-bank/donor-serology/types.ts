import type { CaseInvoice, CasePatient } from "@/modules/blood-bank/cases/types"
import type { StaffRef } from "@/modules/blood-bank/donor-examinations/types"
import type {
  CareType,
  MalariaResult,
  SampleStatus,
  ScreeningResult,
  SerologyDecision,
} from "@/modules/blood-bank/enums"
import type {
  SampleCollectionCase,
  SampleSubjectInfo,
} from "@/modules/blood-bank/samples/types"
import type { BloodGroup } from "@/modules/shared/patient/enums"

/** The donor sample the serology is recorded on; null until it is collected. */
export type SerologySample = {
  id: number
  sample_no: string
  status: SampleStatus
  collected_at: string
}

/**
 * The four reactive / non-reactive screening tests, by their form and response key. The
 * malarial parasite test has its own values (`MalariaResult`) and is handled separately.
 */
export const screeningTests = [
  "hbsag",
  "anti_hcv",
  "anti_hiv",
  "syphilis",
] as const
export type ScreeningTest = (typeof screeningTests)[number]

export const screeningTestLabels: Record<ScreeningTest, string> = {
  hbsag: "HBsAg (Hepatitis B)",
  anti_hcv: "HCV (Hepatitis C)",
  anti_hiv: "HIV (1 & 2)",
  syphilis: "Syphilis",
}

export const malarialParasiteLabel = "Malarial Parasite"

/**
 * The current result of each test. `version` above 1 means a result was amended;
 * `tested_*` is the latest saved result. `malarial_parasite` is null for a serology saved
 * before that test existed.
 */
export type SerologyResults = Record<ScreeningTest, ScreeningResult> & {
  blood_group: BloodGroup
  malarial_parasite: MalariaResult | null
  version: number
  tested_at: string
  tested_by: StaffRef | null
}

/**
 * One donor row. `decision` is the serology decision, null until the form is saved. A donor
 * deferred at the physical exam has `case_donor_status` `deferred` with no `serology`. The
 * form can be saved only while `can_record`.
 */
export type SerologyDonor = SampleSubjectInfo & {
  sample: SerologySample | null
  serology: SerologyResults | null
  decision: SerologyDecision | null
  deferral_reason: string | null
  assessed_at: string | null
  assessed_by: StaffRef | null
  can_record: boolean
}

/** `DonorSerologyResource`: the information panel and one row per case donor in sequence order. */
export type DonorSerology = {
  case: SampleCollectionCase
  patient: CasePatient | null
  invoice: CaseInvoice | null
  donors: SerologyDonor[]
}

/** Body of `PUT /cases/{id}/donors/{caseDonorId}/serology`. */
export type DonorSerologyInput = Record<ScreeningTest, ScreeningResult> & {
  blood_group: BloodGroup
  malarial_parasite: MalariaResult
  decision: SerologyDecision
  /** Only with a deferral. */
  deferral_reason?: string
}

/** Exactly one of them is sent to `GET /donor-serology`. */
export type SerologyLookup = { invoice_no: string } | { sample_no: string }

/** Filters the backend allows on `GET /api/blood-bank/donor-serology/pending`. */
export type PendingSerologyFilters = {
  care_type?: CareType | null
}

/** Sorts the backend allows on the pending list. */
export const pendingSerologySortableColumns = ["case_no", "created_at"] as const
