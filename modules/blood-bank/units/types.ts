import type {
  MalariaResult,
  ScreeningResult,
  UnitStatus,
} from "@/modules/blood-bank/enums"
import type { BloodGroup } from "@/modules/shared/patient/enums"

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
  /** The case the bag was collected for; its labels are printed through it. */
  bag_case_id: number
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

/**
 * A unit label already logged as printed: returned by a label print, and by Collect for the
 * units it just made (`collected_units`).
 */
export type LoggedUnitLabel = Unit & {
  label_print: {
    is_reprint: boolean
    reprint_reason: string | null
    printed_at: string
  }
  /** Raw label printer command (GoDEX EZPL, `\r\n` line endings), sent to the printer as is. */
  label_command: string
}

/** One label returned by `POST /cases/{id}/unit-labels`, in the order requested. */
export type UnitLabel = LoggedUnitLabel & {
  screening: UnitScreening[]
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
