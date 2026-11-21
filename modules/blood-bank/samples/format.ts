import {
  CaseDonorSource,
  caseDonorSourceLabels,
  SampleSubject,
  sampleSubjectLabels,
} from "@/modules/blood-bank/enums"
import type { CaseComponent } from "@/modules/blood-bank/cases/types"
import type {
  CollectSubjectInput,
  SampleSubjectInfo,
} from "@/modules/blood-bank/samples/types"

/** "Patient", "Donor #2" or "Stock bag #3". */
export function subjectLabel(
  subject: Pick<SampleSubjectInfo, "subject_type" | "sequence_no" | "source">
): string {
  if (subject.subject_type === SampleSubject.Donor) {
    const kind =
      subject.source === CaseDonorSource.Stock
        ? caseDonorSourceLabels.stock
        : sampleSubjectLabels.donor
    return subject.sequence_no === null
      ? kind
      : `${kind} #${subject.sequence_no}`
  }
  return sampleSubjectLabels.patient
}

/** A stock bag standing in for a donor (not a person who came to donate). */
export function isStockRow(
  subject: Pick<SampleSubjectInfo, "source">
): boolean {
  return subject.source === CaseDonorSource.Stock
}

/** Stable grid row key: the patient appears once, donors by their case donor id. */
export function subjectKey(subject: SampleSubjectInfo): string {
  return subject.subject_type === SampleSubject.Donor
    ? `donor-${subject.case_donor_id ?? "unknown"}`
    : "patient"
}

/** The collect request entry for a row; null for a donor row without a case donor id. */
export function toCollectInput(
  subject: SampleSubjectInfo
): CollectSubjectInput | null {
  if (subject.subject_type === SampleSubject.Patient) {
    return { subject_type: SampleSubject.Patient }
  }
  return subject.case_donor_id === null
    ? null
    : {
        subject_type: SampleSubject.Donor,
        case_donor_id: subject.case_donor_id,
      }
}

/** "PCV × 2, FP × 1", or null when none were requested. */
export function componentsSummary(components: CaseComponent[]): string | null {
  return components.length === 0
    ? null
    : components.map((line) => `${line.code} × ${line.quantity}`).join(", ")
}
