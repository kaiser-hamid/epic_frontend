import type { CaseInvoice, CasePatient } from "@/modules/blood-bank/cases/types"
import type { StaffRef } from "@/modules/blood-bank/donor-examinations/types"
import type { CareType, CollectionStatus } from "@/modules/blood-bank/enums"
import type {
  SampleCollectionCase,
  SampleSubjectInfo,
} from "@/modules/blood-bank/samples/types"
import type { BloodGroup, Gender } from "@/modules/shared/patient/enums"

/**
 * A donor's bag on the collection screen. `label_print_count` 0 means the label was never
 * printed, so the next print needs no reason.
 */
export type DonorBag = {
  id: number
  bag_no: string
  status: CollectionStatus
  volume_ml: number
  notes: string | null
  collected_at: string
  collected_by: StaffRef
  label_print_count: number
}

/**
 * One donor row. "Collect" is enabled while `is_collectable` (the donor is `eligible`, has no
 * bag yet and the case is open). `collection` is null until the blood is collected.
 */
export type CollectionDonor = SampleSubjectInfo & {
  is_collectable: boolean
  collection: DonorBag | null
}

/**
 * `BloodCollectionResource`: the information panel and one row per case donor in sequence
 * order (only the scanned donor after a donor no scan). `collected_collection_id` is the bag
 * the request that returned it just drew (null except after a collect).
 */
export type BloodCollection = {
  case: SampleCollectionCase
  patient: CasePatient | null
  invoice: CaseInvoice | null
  donors: CollectionDonor[]
  collected_collection_id: number | null
}

/** The scan: an invoice no (the case bill or an added donor's bill), or a donor no. */
export type BloodCollectionLookup =
  { invoice_no: string } | { donor_no: string }

/** Body of `POST /cases/{id}/donors/{caseDonorId}/collection`. */
export type CollectBloodInput = {
  volume_ml: number
  notes: string | null
  /** ISO 8601; null leaves it to the server (now). */
  collected_at: string | null
}

/**
 * `BagResource`: a bag with its donor, case and patient; a row of the Collected tab and the
 * content of a bag label. Ages are in years.
 */
export type Bag = {
  id: number
  bag_no: string
  status: CollectionStatus
  volume_ml: number
  notes: string | null
  collected_at: string
  collected_by: StaffRef
  donor: {
    case_donor_id: number
    sequence_no: number
    donor_no: string
    name: string
    age: number | null
    gender: Gender | null
    blood_group: BloodGroup | null
  }
  case: { id: number; case_no: string; care_type: CareType }
  patient: {
    patient_no: string
    name: string
    age: number | null
    gender: Gender | null
    blood_group: BloodGroup | null
  } | null
}

/** One label returned by `POST /cases/{id}/bag-labels`, in the order requested. */
export type BagLabel = Bag & {
  label_print: {
    is_reprint: boolean
    reprint_reason: string | null
    printed_at: string
  }
  /** Raw label printer command (GoDEX EZPL, `\r\n` line endings), sent to the printer as is. */
  label_command: string
}

/** Filters the backend allows on `GET /api/blood-bank/blood-collections`. */
export type BagFilters = {
  /** Exact, for a bag label barcode scan. */
  bag_no?: string | null
  /** Exact. */
  case_no?: string | null
  /** Exact. */
  donor_no?: string | null
  status?: CollectionStatus | null
  /** `YYYY-MM-DD`, inclusive. */
  collected_from?: string | null
  collected_to?: string | null
}

/** Sorts the backend allows on the bag list. Column ids use the same names. */
export const bagSortableColumns = ["bag_no", "collected_at"] as const

/** Filters the backend allows on `GET /api/blood-bank/blood-collection/pending`. */
export type PendingBloodCollectionFilters = {
  care_type?: CareType | null
}

/** Sorts the backend allows on the pending list. */
export const pendingBloodCollectionSortableColumns = [
  "case_no",
  "created_at",
] as const
