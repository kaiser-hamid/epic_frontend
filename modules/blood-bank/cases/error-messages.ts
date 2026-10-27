/** Text for Blood Bank case error codes. Keys must match the backend `errorCode()` values. */
export const caseErrorMessages: Partial<Record<string, string>> = {
  CASE_NOT_OPEN: "Only open cases can be changed.",
  CASE_HAS_ISSUED_UNITS: "This case has issued units and cannot be cancelled.",
}
