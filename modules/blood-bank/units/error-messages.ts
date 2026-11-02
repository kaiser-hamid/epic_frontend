import { ErrorCode, errorMessage, isApiError } from "@/lib/api-error"

/** Component preparation error codes (`modules/BloodBank/Exceptions` `errorCode()` values). */
export const UnitErrorCode = {
  BagNotFound: "BAG_NOT_FOUND",
  CaseNotOpen: "CASE_NOT_OPEN",
  CollectionNotInCase: "COLLECTION_NOT_IN_CASE",
  BagCancelled: "BAG_CANCELLED",
  BagAlreadyPrepared: "BAG_ALREADY_PREPARED",
  ComponentNotNeeded: "COMPONENT_NOT_NEEDED",
  ComponentRequirementNotMet: "COMPONENT_REQUIREMENT_NOT_MET",
  UnitNotInCase: "UNIT_NOT_IN_CASE",
} as const

/**
 * Codes meaning the screen is out of date (the bag was prepared or cancelled, the case closed,
 * or the case's held units changed meanwhile): toast, then reload it.
 */
export const unitReloadCodes: readonly string[] = [
  UnitErrorCode.BagAlreadyPrepared,
  UnitErrorCode.BagCancelled,
  UnitErrorCode.CaseNotOpen,
  UnitErrorCode.CollectionNotInCase,
  UnitErrorCode.ComponentNotNeeded,
  UnitErrorCode.ComponentRequirementNotMet,
]

/** Text for component preparation error codes. */
export const unitErrorMessages: Partial<Record<string, string>> = {
  [UnitErrorCode.BagNotFound]: "Bag not found in this branch",
  [UnitErrorCode.CaseNotOpen]: "Case is closed",
  [UnitErrorCode.CollectionNotInCase]: "Bag is not on this case",
  [UnitErrorCode.BagCancelled]: "Bag was cancelled",
  [UnitErrorCode.BagAlreadyPrepared]: "Already prepared",
  [UnitErrorCode.ComponentNotNeeded]:
    "This component wasn't billed for the patient (or was already given). Send it to stock instead.",
  [UnitErrorCode.UnitNotInCase]: "Unit is not on this case",
  [ErrorCode.ReprintReasonRequired]: "Enter a reason to reprint the label.",
  [ErrorCode.Forbidden]: "Not allowed",
  [ErrorCode.NotFound]: "This bag was not found.",
  INVALID_QUERY: "This list filter is not supported.",
}

/**
 * Text for a component preparation error. A validation error without a field to sit under (a
 * scan lookup, a label print) shows the server's first field message instead of the generic
 * one. `COMPONENT_REQUIREMENT_NOT_MET` shows the server's message, which names what the
 * patient is missing ("The case needs PCV for the patient; …"); the code still decides that.
 */
export function unitErrorText(error: unknown): string {
  if (
    isApiError(error) &&
    error.code === UnitErrorCode.ComponentRequirementNotMet &&
    error.message
  ) {
    return error.message
  }
  if (isApiError(error) && error.isValidation) {
    const first = Object.values(error.errors)[0]?.[0]
    if (first) {
      return first
    }
  }
  return errorMessage(error, unitErrorMessages)
}
