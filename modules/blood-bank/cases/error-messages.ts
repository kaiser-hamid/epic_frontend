/**
 * Text for Blood Bank case error codes. Keys must match the backend `errorCode()` values.
 * Cases are opened from Blood Bank bills; here they are listed, their details edited and,
 * when they do not close by themselves, closed.
 */
export const caseErrorMessages: Partial<Record<string, string>> = {
  INVALID_QUERY: "This list filter is not supported.",
  CASE_NOT_OPEN: "This case is closed; its details can no longer be changed.",
  CASE_HAS_RESERVED_UNITS:
    "Units are still reserved for this case. Return them to stock before closing it.",
  CLOSE_REASON_REQUIRED:
    "Billed work is still outstanding on this case; give a reason to close it.",
}
