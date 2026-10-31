import type {
  CaseComponent,
  CaseInvoice,
  CasePatient,
} from "@/modules/blood-bank/cases/types"
import type {
  CareType,
  CaseDonorStatus,
  CaseStatus,
  SampleStatus,
  SampleSubject,
} from "@/modules/blood-bank/enums"
import type { BloodGroup, Gender } from "@/modules/shared/patient/enums"

/**
 * Who a sample is drawn from (`SubjectResource`), in one shape for the patient and donors.
 * `number` is the patient no or donor no; `age` is in years. The `case_donor_*` and
 * `sequence_no` fields are null for the patient.
 */
export type SampleSubjectInfo = {
  subject_type: SampleSubject
  case_donor_id: number | null
  case_donor_status: CaseDonorStatus | null
  /** 2 or more: a replacement donor. */
  sequence_no: number | null
  number: string | null
  name: string | null
  age: number | null
  gender: Gender | null
  blood_group: BloodGroup | null
  phone: string | null
}

/** A row's latest sample. `label_print_count` 0 means the next label print needs no reason. */
export type CollectionSample = {
  id: number
  sample_no: string
  status: SampleStatus
  collected_at: string
  label_print_count: number
}

/** One grid row of the collection screen. */
export type CollectionSubject = SampleSubjectInfo & {
  is_collectable: boolean
  sample: CollectionSample | null
}

export type SampleCollectionCase = {
  id: number
  case_no: string
  status: CaseStatus
  care_type: CareType
  transfusion_reason: string | null
  reference_note: string | null
  created_at: string | null
  components: CaseComponent[]
}

/**
 * `SampleCollectionResource`: the patient information panel and the grid (the patient first,
 * then donors in sequence order). `collected_sample_ids` lists the samples the request that
 * returned it just drew (empty except after a collect).
 */
export type SampleCollection = {
  case: SampleCollectionCase
  patient: CasePatient | null
  invoice: CaseInvoice | null
  subjects: CollectionSubject[]
  collected_sample_ids: number[]
}

/** `SampleResource`: a sample with its case and subject; also the content of a label. */
export type Sample = {
  id: number
  sample_no: string
  status: SampleStatus
  collected_at: string
  case: { id: number; case_no: string; care_type: CareType }
  subject: SampleSubjectInfo
}

/** A row of `GET /api/blood-bank/samples`. */
export type SampleListItem = Sample & {
  collected_by: { id: number; name: string }
}

/** One label returned by `POST /cases/{id}/sample-labels`, in the order requested. */
export type SampleLabel = Sample & {
  label_print: {
    is_reprint: boolean
    reprint_reason: string | null
    printed_at: string
  }
}

/** One ticked row sent to `POST /cases/{id}/samples`. */
export type CollectSubjectInput =
  | { subject_type: typeof SampleSubject.Patient }
  | { subject_type: typeof SampleSubject.Donor; case_donor_id: number }

/** Filters the backend allows on `GET /api/blood-bank/samples`. */
export type SampleFilters = {
  /** Exact, for a label barcode scan. */
  sample_no?: string | null
  /** Exact. */
  case_no?: string | null
  status?: SampleStatus | null
  subject_type?: SampleSubject | null
  /** `YYYY-MM-DD`, inclusive. */
  collected_from?: string | null
  collected_to?: string | null
}

/** Sorts the backend allows on the sample list. Column ids use the same names. */
export const sampleSortableColumns = ["sample_no", "collected_at"] as const

/** Filters the backend allows on `GET /api/blood-bank/sample-collection/pending`. */
export type PendingCollectionFilters = {
  care_type?: CareType | null
}

/** Sorts the backend allows on the pending list. */
export const pendingCollectionSortableColumns = [
  "case_no",
  "created_at",
] as const
