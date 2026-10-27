import type { Abilities } from "@/lib/api-types"
import type { ComponentType } from "@/modules/blood-bank/component-types/types"
import type { CareType, CaseStatus } from "@/modules/blood-bank/enums"
import type { Patient } from "@/modules/shared/patient/types"

export type CaseAction = "update" | "cancel" | "close"

/** Requested component line (`bb_case_components`). */
export type CaseComponent = {
  id: number
  component_type_id: number
  quantity: number
  /** Units assigned to the case for this component type. */
  assigned_quantity: number
  component_type?: ComponentType
}

/** `bb_cases` resource. Relations are present only when requested with `include`. */
export type BloodBankCase = {
  id: number
  case_no: string
  status: CaseStatus
  care_type: CareType
  transfusion_reason: string | null
  reference_note: string | null
  patient_master_id: number
  billing_id: number | null
  supplied_at: string | null
  created_at: string
  updated_at: string
  patient?: Patient
  components?: CaseComponent[]
  abilities: Abilities<CaseAction>
}

/** Filters the backend allows on `GET /api/blood-bank/cases`. */
export type CaseFilters = {
  status?: CaseStatus | null
  /** case_no, patient no/name, invoice no. */
  search?: string | null
}

/** Sorts the backend allows. Column ids in the table use the same names. */
export const caseSortableColumns = ["case_no", "created_at"] as const
