/**
 * Text for Blood Bank case error codes. Keys must match the backend `errorCode()` values.
 * Cases are opened from Blood Bank bills; here they are listed and their details edited.
 */
export const caseErrorMessages: Partial<Record<string, string>> = {
  INVALID_QUERY: "This list filter is not supported.",
  CASE_NOT_OPEN: "This case is closed; its details can no longer be changed.",
}
