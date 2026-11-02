import { serologyLookup } from "@/modules/blood-bank/donor-serology/api"
import type { DonorSerology } from "@/modules/blood-bank/donor-serology/types"

/**
 * The case donor a scan focuses the screen on: a sample scan returns only the donor the
 * sample was drawn from; an invoice scan shows every donor (null).
 */
export function scanFocus(scanned: string, view: DonorSerology): number | null {
  if (!("sample_no" in serologyLookup(scanned))) {
    return null
  }
  return view.donors[0]?.case_donor_id ?? null
}

/**
 * The screen limited to the focused donor. The case screen and a save always return every
 * donor, so a sample-scanned screen keeps showing only its own row.
 */
export function focusView(
  view: DonorSerology,
  focusDonorId: number | null
): DonorSerology {
  if (focusDonorId === null) {
    return view
  }
  return {
    ...view,
    donors: view.donors.filter((donor) => donor.case_donor_id === focusDonorId),
  }
}
