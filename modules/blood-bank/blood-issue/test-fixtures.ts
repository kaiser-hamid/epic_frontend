import type {
  BloodIssue,
  IssueDonor,
  IssueUnit,
} from "@/modules/blood-bank/blood-issue/types"

/** Test data only: a blood issue screen and its parts. */

const staff = { id: 3, name: "Lab Tech" }

export function issueDonor(
  sequence: number,
  overrides: Partial<IssueDonor> = {}
): IssueDonor {
  return {
    subject_type: "donor",
    case_donor_id: 100 + sequence,
    case_donor_status: "collected",
    sequence_no: sequence,
    number: `D000${sequence}`,
    name: `Donor ${sequence}`,
    age: 30,
    gender: "male",
    blood_group: "B_POS",
    phone: null,
    invoice_no: null,
    deferral_reason: null,
    assessed_at: "2026-11-02T08:00:00+06:00",
    assessed_by: staff,
    examination: {
      weight_kg: 70,
      height_cm: null,
      hemoglobin_g_dl: 14,
      pre: {
        pulse_bpm: 72,
        bp_systolic: 120,
        bp_diastolic: 80,
        temperature_f: 98.4,
      },
      examined_at: "2026-11-02T08:00:00+06:00",
      examined_by: staff,
      post: null,
    },
    serology: null,
    bag: {
      id: 200 + sequence,
      bag_no: `BAG-${sequence}`,
      status: "collected",
      volume_ml: 450,
      collected_at: "2026-11-02T09:00:00+06:00",
      collected_by: staff,
    },
    needs_post_vitals: true,
    ...overrides,
  }
}

export function issueUnit(
  id: number,
  donorSequence: number,
  overrides: Partial<IssueUnit> = {}
): IssueUnit {
  return {
    id,
    unit_no: `U-${id}`,
    status: "reserved",
    component: {
      id: 2,
      code: "PCV",
      name: "Packed Cell",
      storage_condition: null,
    },
    blood_group: "B_POS",
    volume_ml: 250,
    storage_location: null,
    bag_no: `BAG-${donorSequence}`,
    donor_no: `D000${donorSequence}`,
    collected_at: "2026-11-02T09:00:00+06:00",
    prepared_at: "2026-11-02T10:00:00+06:00",
    expires_at: "2026-12-07T10:00:00+06:00",
    reserved_for: {
      case_id: 1,
      case_no: "BB-0001",
      patient_no: "P-1",
      patient_name: "Patient One",
    },
    crossmatch: null,
    compatibility_report_print_count: 0,
    can_issue: true,
    ...overrides,
  }
}

/**
 * Case 1: donor #1 and #2 still need post-donation vitals, donor #3's are recorded. Units 11,
 * 12, 13 come from donors 1, 2, 3 and can all be issued. The patient group is B+.
 */
export function bloodIssueView(
  overrides: Partial<BloodIssue> = {}
): BloodIssue {
  const recorded = issueDonor(3, { needs_post_vitals: false })
  return {
    case: {
      id: 1,
      case_no: "BB-0001",
      status: "open",
      care_type: "daycare",
      transfusion_reason: "Anaemia",
      reference_note: null,
      created_at: "2026-11-02T07:00:00+06:00",
      supplied_at: null,
      components: [
        {
          component_type_id: 2,
          code: "PCV",
          name: "Packed Cell",
          quantity: 3,
          reserved_count: 3,
          issued_count: 0,
          remaining_count: 3,
        },
      ],
    },
    patient: null,
    invoice: null,
    patient_sample: {
      id: 50,
      sample_no: "S-50",
      status: "tested",
      collected_at: "2026-11-02T07:30:00+06:00",
      blood_group: {
        value: "B_POS",
        version: 1,
        tested_at: "2026-11-02T07:45:00+06:00",
        tested_by: staff,
      },
    },
    donors: [
      issueDonor(1),
      issueDonor(2),
      {
        ...recorded,
        examination: recorded.examination && {
          ...recorded.examination,
          post: {
            pulse_bpm: 80,
            bp_systolic: 118,
            bp_diastolic: 76,
            temperature_f: 98.6,
            recorded_at: "2026-11-02T09:20:00+06:00",
            recorded_by: staff,
          },
        },
      },
    ],
    units: [issueUnit(11, 1), issueUnit(12, 2), issueUnit(13, 3)],
    can_issue: true,
    ...overrides,
  }
}
