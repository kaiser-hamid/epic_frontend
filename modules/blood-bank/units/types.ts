import type { Bag } from "@/modules/blood-bank/blood-collections/types"
import type { CaseComponent } from "@/modules/blood-bank/cases/types"
import type {
  MalariaResult,
  ScreeningResult,
  UnitStatus,
} from "@/modules/blood-bank/enums"
import type { SampleCollectionCase } from "@/modules/blood-bank/samples/types"
import type { BloodGroup } from "@/modules/shared/patient/enums"

/** Code of the whole-blood component type (`ComponentType::WHOLE_BLOOD`). */
export const WHOLE_BLOOD_CODE = "WB"

/**
 * `UnitResource`: a blood unit with its component, storage location and source bag; also a
 * row of the Units tab. `reserved_for` is the case and patient the unit is reserved for or
 * issued to, null for stock.
 */
export type Unit = {
  id: number
  unit_no: string
  status: UnitStatus
  component: {
    id: number
    code: string
    name: string
    storage_condition: string | null
  }
  blood_group: BloodGroup | null
  volume_ml: number | null
  storage_location: { id: number; code: string; name: string } | null
  bag_no: string
  donor_no: string
  collected_at: string
  prepared_at: string
  expires_at: string
  reserved_for: {
    case_id: number
    case_no: string
    patient_no: string | null
    patient_name: string | null
  } | null
}

/** One screening test on a label; `result` is null until the serology is recorded. */
export type UnitScreening = {
  code: string
  name: string
  /** E.g. "ICT method"; only some tests have one. */
  method?: string | null
  result: ScreeningResult | MalariaResult | null
}

/** One label returned by `POST /cases/{id}/unit-labels`, in the order requested. */
export type UnitLabel = Unit & {
  screening: UnitScreening[]
  label_print: {
    is_reprint: boolean
    reprint_reason: string | null
    printed_at: string
  }
  /** Raw label printer command (GoDEX EZPL, `\r\n` line endings), sent to the printer as is. */
  label_command: string
}

/** A unit made from the bag. `label_print_count` 0 means its label was never printed. */
export type PreparationUnit = Unit & { label_print_count: number }

/**
 * A billed component: how many units the case already holds (reserved or issued) and how many
 * this bag must still give the patient (`needed_count` = quantity − held, never below 0).
 */
export type PreparationComponent = CaseComponent & {
  held_count: number
  needed_count: number
}

/**
 * `ComponentPreparationResource`: the bag (with donor and patient), its case with the
 * requested components, and the units already made from it. "Prepare" is shown while
 * `can_prepare`. After a prepare, `prepared_unit_ids` lists the new units (else empty).
 */
export type ComponentPreparation = {
  bag: Bag
  case: Omit<SampleCollectionCase, "components"> & {
    components: PreparationComponent[]
  }
  units: PreparationUnit[]
  can_prepare: boolean
  prepared_unit_ids: number[]
}

/** One unit row of `POST /cases/{id}/bags/{bagId}/units`. */
export type PreparedUnitInput = {
  component_type_id: number
  /** Required for stock; optional for a patient unit. */
  storage_location_id?: number
  volume_ml?: number
  /** Reserve it for this case's patient; otherwise it goes to stock. */
  for_case: boolean
}

/** Body of `POST /cases/{id}/bags/{bagId}/units`. */
export type PrepareUnitsInput = {
  units: PreparedUnitInput[]
  /** ISO 8601; left out means now. */
  prepared_at?: string
}

/** Filters the backend allows on `GET /api/blood-bank/units`. */
export type UnitFilters = {
  /** Exact, for a unit label barcode scan. */
  unit_no?: string | null
  /** Exact. */
  bag_no?: string | null
  /** Exact: the case a unit is reserved for or issued to. */
  case_no?: string | null
  component_type_id?: number | null
  blood_group?: BloodGroup | null
  status?: UnitStatus | null
  storage_location_id?: number | null
  /** `YYYY-MM-DD`, inclusive. */
  expires_before?: string | null
}

/** Sorts the backend allows on the unit list. Column ids use the same names. */
export const unitSortableColumns = [
  "expires_at",
  "prepared_at",
  "unit_no",
] as const

/** Sorts the backend allows on the pending list (bags awaiting preparation). */
export const pendingPreparationSortableColumns = [
  "bag_no",
  "collected_at",
] as const
