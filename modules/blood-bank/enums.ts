/**
 * Mirrors the backend PHP enums in `modules/BloodBank/Enums`. Values must match
 * exactly; labels are UI-only. Update both sides together.
 */

type ValueOf<T> = T[keyof T]

export const CaseStatus = {
  Open: "open",
  Closed: "closed",
  Cancelled: "cancelled",
} as const
export type CaseStatus = ValueOf<typeof CaseStatus>

export const caseStatusLabels: Record<CaseStatus, string> = {
  open: "Open",
  closed: "Closed",
  cancelled: "Cancelled",
}

/** Register column "Care of". */
export const CareType = {
  Daycare: "daycare",
  Out: "out",
} as const
export type CareType = ValueOf<typeof CareType>

export const careTypeLabels: Record<CareType, string> = {
  daycare: "Daycare",
  out: "Takeaway",
}

export const CaseDonorStatus = {
  Registered: "registered",
  Eligible: "eligible",
  Deferred: "deferred",
  Collected: "collected",
} as const
export type CaseDonorStatus = ValueOf<typeof CaseDonorStatus>

export const SampleStatus = {
  Collected: "collected",
  InTesting: "in_testing",
  Tested: "tested",
  Rejected: "rejected",
} as const
export type SampleStatus = ValueOf<typeof SampleStatus>

/** Shared by test results and crossmatches. */
export const ResultStatus = {
  Entered: "entered",
  Reviewed: "reviewed",
  Rejected: "rejected",
} as const
export type ResultStatus = ValueOf<typeof ResultStatus>

export const CollectionStatus = {
  Collected: "collected",
  Cancelled: "cancelled",
} as const
export type CollectionStatus = ValueOf<typeof CollectionStatus>

export const UnitStatus = {
  Available: "available",
  Reserved: "reserved",
  Issued: "issued",
  Quarantined: "quarantined",
  Discarded: "discarded",
  Expired: "expired",
} as const
export type UnitStatus = ValueOf<typeof UnitStatus>

export const CrossmatchResult = {
  Compatible: "compatible",
  Incompatible: "incompatible",
} as const
export type CrossmatchResult = ValueOf<typeof CrossmatchResult>
