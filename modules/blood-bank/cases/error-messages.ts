/**
 * Text for Blood Bank case error codes. Keys must match the backend `errorCode()` values.
 * Registration only returns the shared codes so far (`VALIDATION_FAILED`, `FORBIDDEN`, …).
 */
export const caseErrorMessages: Partial<Record<string, string>> = {
  INVALID_QUERY: "This list filter is not supported.",
}
