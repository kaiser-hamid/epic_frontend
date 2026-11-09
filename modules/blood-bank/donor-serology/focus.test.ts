import { describe, expect, it } from "vitest"

import { focusView, scanFocus } from "@/modules/blood-bank/donor-serology/focus"
import type {
  DonorSerology,
  SerologyDonor,
} from "@/modules/blood-bank/donor-serology/types"

function donor(caseDonorId: number): SerologyDonor {
  return {
    subject_type: "donor",
    case_donor_id: caseDonorId,
    case_donor_status: "fit",
    sequence_no: caseDonorId,
    number: null,
    name: null,
    age: null,
    age_label: null,
    gender: null,
    blood_group: null,
    phone: null,
    sample: null,
    serology: null,
    decision: null,
    deferral_reason: null,
    assessed_at: null,
    assessed_by: null,
    can_record: true,
  }
}

const view: DonorSerology = {
  case: {
    id: 1,
    case_no: "C-1",
    status: "open",
    care_type: "daycare",
    transfusion_reason: null,
    reference_note: null,
    created_at: null,
    components: [],
  },
  patient: null,
  invoice: null,
  donors: [donor(10), donor(11)],
}

describe("scanFocus", () => {
  it("focuses the sample's donor only for a sample scan", () => {
    expect(scanFocus("S2611020001", { ...view, donors: [donor(11)] })).toBe(11)
    expect(scanFocus("NB2611020001", view)).toBeNull()
  })
})

describe("focusView", () => {
  it("keeps only the focused donor of a full response", () => {
    expect(focusView(view, 11).donors.map((row) => row.case_donor_id)).toEqual([
      11,
    ])
    expect(focusView(view, null)).toBe(view)
  })
})
