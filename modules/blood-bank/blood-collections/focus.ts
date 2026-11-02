import { bloodCollectionLookup } from "@/modules/blood-bank/blood-collections/api"
import type { BloodCollection } from "@/modules/blood-bank/blood-collections/types"

/**
 * The case donor a scan focuses the screen on: a donor no scan returns only that donor; an
 * invoice scan shows every donor (null).
 */
export function scanFocus(
  scanned: string,
  view: BloodCollection
): number | null {
  if (!("donor_no" in bloodCollectionLookup(scanned))) {
    return null
  }
  return view.donors[0]?.case_donor_id ?? null
}

/**
 * The screen limited to the focused donor. The case screen and a collect always return every
 * donor, so a donor-scanned screen keeps showing only its own row.
 */
export function focusView(
  view: BloodCollection,
  focusDonorId: number | null
): BloodCollection {
  if (focusDonorId === null) {
    return view
  }
  return {
    ...view,
    donors: view.donors.filter((donor) => donor.case_donor_id === focusDonorId),
  }
}
