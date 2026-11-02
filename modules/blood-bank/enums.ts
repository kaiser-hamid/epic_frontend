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
  Fit: "fit",
  Eligible: "eligible",
  Deferred: "deferred",
  Collected: "collected",
} as const
export type CaseDonorStatus = ValueOf<typeof CaseDonorStatus>

export const caseDonorStatusLabels: Record<CaseDonorStatus, string> = {
  registered: "Registered",
  fit: "Fit",
  eligible: "Eligible",
  deferred: "Deferred",
  collected: "Collected",
}

export const SampleStatus = {
  Collected: "collected",
  InTesting: "in_testing",
  Tested: "tested",
  Rejected: "rejected",
} as const
export type SampleStatus = ValueOf<typeof SampleStatus>

export const sampleStatusLabels: Record<SampleStatus, string> = {
  collected: "Collected",
  in_testing: "In testing",
  tested: "Tested",
  rejected: "Rejected",
}

/** Who a sample is drawn from. */
export const SampleSubject = {
  Patient: "patient",
  Donor: "donor",
} as const
export type SampleSubject = ValueOf<typeof SampleSubject>

export const sampleSubjectLabels: Record<SampleSubject, string> = {
  patient: "Patient",
  donor: "Donor",
}

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

export const collectionStatusLabels: Record<CollectionStatus, string> = {
  collected: "Collected",
  cancelled: "Cancelled",
}

export const UnitStatus = {
  Available: "available",
  Reserved: "reserved",
  Issued: "issued",
  Quarantined: "quarantined",
  Discarded: "discarded",
  Expired: "expired",
} as const
export type UnitStatus = ValueOf<typeof UnitStatus>

/** "For patient" and "In stock" are how the preparation screen names reserved and available. */
export const unitStatusLabels: Record<UnitStatus, string> = {
  available: "In stock",
  reserved: "For patient",
  issued: "Issued",
  quarantined: "Quarantined",
  discarded: "Discarded",
  expired: "Expired",
}

export const StorageLocationType = {
  Refrigerator: "refrigerator",
  Freezer: "freezer",
  PlateletAgitator: "platelet_agitator",
  Other: "other",
} as const
export type StorageLocationType = ValueOf<typeof StorageLocationType>

export const CrossmatchResult = {
  Compatible: "compatible",
  Incompatible: "incompatible",
} as const
export type CrossmatchResult = ValueOf<typeof CrossmatchResult>

/** The physician's decision on the physical examination form. */
export const ExaminationDecision = {
  Accepted: "accepted",
  Deferred: "deferred",
} as const
export type ExaminationDecision = ValueOf<typeof ExaminationDecision>

export const examinationDecisionLabels: Record<ExaminationDecision, string> = {
  accepted: "Accept",
  deferred: "Defer",
}

/** A serology screening test's result (HBsAg, anti-HCV, anti-HIV, syphilis). */
export const ScreeningResult = {
  NonReactive: "non_reactive",
  Reactive: "reactive",
} as const
export type ScreeningResult = ValueOf<typeof ScreeningResult>

export const screeningResultLabels: Record<ScreeningResult, string> = {
  non_reactive: "Non-Reactive",
  reactive: "Reactive",
}

/** The physician's decision on the serology form. Never `accepted` with a reactive result. */
export const SerologyDecision = {
  Accepted: "accepted",
  Deferred: "deferred",
} as const
export type SerologyDecision = ValueOf<typeof SerologyDecision>

export const serologyDecisionLabels: Record<SerologyDecision, string> = {
  accepted: "Accept",
  deferred: "Defer",
}
