import type { SerologyDonor } from "@/modules/blood-bank/donor-serology/types"
import {
  CaseDonorStatus,
  CaseStatus,
  type CaseStatus as CaseStatusValue,
} from "@/modules/blood-bank/enums"

/**
 * Why a donor's serology can't be recorded now, or null while it can. The backend decides
 * (`can_record`); this only explains its answer, in the order the backend checks.
 */
export function serologyLockReason(
  donor: SerologyDonor,
  caseStatus: CaseStatusValue
): string | null {
  if (donor.can_record) {
    return null
  }
  if (caseStatus !== CaseStatus.Open) {
    return "Case closed"
  }

  switch (donor.case_donor_status) {
    case CaseDonorStatus.Collected:
      return "Bag collected — locked"
    case CaseDonorStatus.Registered:
      return "Awaiting physical examination"
    case CaseDonorStatus.Deferred:
      if (donor.serology === null) {
        return donor.deferral_reason
          ? `Deferred at physical examination: ${donor.deferral_reason}`
          : "Deferred at physical examination"
      }
      break
  }

  if (donor.sample === null) {
    return "Awaiting sample collection"
  }
  return "Serology can't be recorded now"
}
