import type { CaseInvoice, CasePatient } from "@/modules/blood-bank/cases/types"
import type { StaffRef } from "@/modules/blood-bank/donor-examinations/types"
import type {
  CareType,
  CollectionStatus,
  StorageLocationType,
} from "@/modules/blood-bank/enums"
import type {
  SampleCollectionCase,
  SampleSubjectInfo,
} from "@/modules/blood-bank/samples/types"
import type { LoggedUnitLabel } from "@/modules/blood-bank/units/types"
import type { BloodGroup, Gender } from "@/modules/shared/patient/enums"

/** A donor's bag on the collection screen. */
export type DonorBag = {
  id: number
  bag_no: string
  status: CollectionStatus
  notes: string | null
  collected_at: string
  collected_by: StaffRef
}

/**
 * One donor row. "Collect" is enabled while `is_collectable` (the donor is `eligible`, has no
 * bag yet, the case is open and still needs something). `collection` is null until collected.
 */
export type CollectionDonor = SampleSubjectInfo & {
  is_collectable: boolean
  collection: DonorBag | null
}

/**
 * One unit the next bag is made into. Patient rows (`for_patient`) come first and are
 * reserved for the case; the rest go to stock. `needs_storage_location`: stock rows, and
 * patient rows of a case that keeps its units in storage (SWPF01); the shelf is pre-filled
 * from a location of `default_location_type`.
 */
export type BagPlanRow = {
  component_type_id: number
  code: string
  name: string
  for_patient: boolean
  needs_storage_location: boolean
  default_location_type: StorageLocationType | null
}

/**
 * `BloodCollectionResource`: the information panel and one row per case donor in sequence
 * order (only the scanned donor after a donor no scan). `bag_plan` is what the next bag is
 * made into (empty when the case needs nothing more). After a collect,
 * `collected_collection_id` is the new bag and `collected_units` its units, already logged as
 * printed, with the label commands to send to the printer.
 */
export type BloodCollection = {
  case: SampleCollectionCase
  patient: CasePatient | null
  invoice: CaseInvoice | null
  donors: CollectionDonor[]
  bag_plan: BagPlanRow[]
  /** True on an open Therapeutic Phlebotomy case: show "Mark done". */
  can_record_phlebotomy: boolean
  /** The recorded phlebotomy (Therapeutic Phlebotomy cases only); null until done. */
  phlebotomy: Phlebotomy | null
  collected_collection_id: number | null
  collected_units: LoggedUnitLabel[]
}

/** The scan: an invoice no (the case bill or an added donor's bill), or a donor no. */
export type BloodCollectionLookup =
  { invoice_no: string } | { donor_no: string }

/** One unit row of the Collect body: a row of the bag plan. */
export type CollectedUnitInput = {
  component_type_id: number
  storage_location_id: number | null
  volume_ml: number | null
}

/** Body of `POST /cases/{id}/donors/{caseDonorId}/collection`. */
export type CollectBloodInput = {
  notes: string | null
  /** ISO 8601; null leaves it to the server (now). */
  collected_at: string | null
  units: CollectedUnitInput[]
}

/**
 * `BagResource`: a bag with its donor, case and patient; a row of the Collected tab.
 * `age` is in years; `age_label` is as shown ("78Y").
 */
export type Bag = {
  id: number
  bag_no: string
  status: CollectionStatus
  notes: string | null
  collected_at: string
  collected_by: StaffRef
  donor: {
    case_donor_id: number
    sequence_no: number
    donor_no: string
    name: string
    age: number | null
    age_label: string | null
    gender: Gender | null
    blood_group: BloodGroup | null
  }
  case: { id: number; case_no: string; care_type: CareType }
  patient: {
    patient_no: string
    name: string
    age: number | null
    age_label: string | null
    gender: Gender | null
    blood_group: BloodGroup | null
  } | null
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

/** One set of vitals on a therapeutic phlebotomy (before or after). */
export type PhlebotomyVitals = {
  pulse_bpm: number
  bp_systolic: number
  bp_diastolic: number
  temperature_f: number
}

/** The recorded therapeutic phlebotomy of a case (one per case). */
export type Phlebotomy = {
  id: number
  volume_ml: number
  pre: PhlebotomyVitals | null
  post: PhlebotomyVitals | null
  notes: string | null
  performed_at: string
  performed_by: StaffRef
}

/** Body of `POST /cases/{id}/therapeutic-phlebotomy`. Each vitals set is all or nothing. */
export type RecordPhlebotomyInput = {
  volume_ml: number
  pre: PhlebotomyVitals | null
  post: PhlebotomyVitals | null
  notes: string | null
  /** ISO 8601; null leaves it to the server (now). */
  performed_at: string | null
}
