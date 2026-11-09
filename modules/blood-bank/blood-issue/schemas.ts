import { z } from "zod"

import type {
  BloodIssue,
  IssueBloodInput,
  IssueDonor,
  IssueUnit,
} from "@/modules/blood-bank/blood-issue/types"
import { parseDecimal } from "@/modules/blood-bank/donor-examinations/format"
import { CrossmatchResult } from "@/modules/blood-bank/enums"
import { BloodGroup } from "@/modules/shared/patient/enums"

/**
 * The "Issue Blood" form: one request that records the patient blood group, the crossmatch of
 * every selected unit, the optional post-donation vitals not yet recorded, and issues the units. Choices
 * start empty ("") so nothing is recorded by accident. The ranges mirror the backend and only
 * catch typos; the backend stays the authority.
 */

export const MAX_ISSUE_UNITS = 20
export const REMARKS_MAX = 1000
export const AMENDMENT_REASON_MAX = 1000
export const REPRINT_REASON_MAX = 500

export const VITALS = {
  pulse_bpm: { min: 20, max: 250 },
  bp_systolic: { min: 50, max: 300 },
  bp_diastolic: { min: 20, max: 200 },
  temperature_f: { min: 90, max: 110 },
} as const

export const INCOMPATIBLE_TEXT = "An incompatible unit cannot be issued."

const crossmatchChoice = (message: string) =>
  z
    .enum(CrossmatchResult)
    .or(z.literal(""))
    .refine((value) => value !== "", { message })

/** A whole number in a range; empty is `undefined` in the form (checked by the row). */
function wholeNumber({ min, max }: { min: number; max: number }) {
  return z
    .number()
    .optional()
    .superRefine((value, ctx) => {
      if (value === undefined) {
        return
      }
      if (!Number.isInteger(value)) {
        ctx.addIssue({ code: "custom", message: "Enter a whole number." })
      } else if (value < min || value > max) {
        ctx.addIssue({
          code: "custom",
          message: `Must be between ${min} and ${max}.`,
        })
      }
    })
}

const unitRowSchema = z.object({
  unit_id: z.number(),
  major_result: crossmatchChoice("Select the major crossmatch result."),
  minor_result: crossmatchChoice("Select the minor crossmatch result."),
  remarks: z
    .string()
    .trim()
    .max(REMARKS_MAX, `At most ${REMARKS_MAX} characters.`),
})

const VITALS_LABELS = {
  pulse_bpm: "pulse",
  bp_systolic: "systolic pressure",
  bp_diastolic: "diastolic pressure",
  temperature_f: "temperature",
} as const

/** Whether a vitals field is left empty. */
function isBlank(value: number | string | undefined): boolean {
  return value === undefined || value === ""
}

/**
 * One donor's post-donation vitals. Optional: a row left empty is skipped. Once one field is
 * filled, all four are needed (the backend takes complete rows only).
 */
const vitalsRowSchema = z
  .object({
    case_donor_id: z.number(),
    pulse_bpm: wholeNumber(VITALS.pulse_bpm),
    bp_systolic: wholeNumber(VITALS.bp_systolic),
    bp_diastolic: wholeNumber(VITALS.bp_diastolic),
    // Typed as text so one decimal ("98.4") can be checked as typed.
    temperature_f: z
      .string()
      .trim()
      .superRefine((value, ctx) => {
        const { min, max } = VITALS.temperature_f
        if (value === "") {
          return
        }
        const number = parseDecimal(value, 1)
        if (number === null) {
          ctx.addIssue({
            code: "custom",
            message: "Enter a number with at most 1 decimal.",
          })
        } else if (number < min || number > max) {
          ctx.addIssue({
            code: "custom",
            message: `Must be between ${min} and ${max}.`,
          })
        }
      }),
  })
  .superRefine((row, ctx) => {
    const names = Object.keys(VITALS_LABELS) as (keyof typeof VITALS_LABELS)[]
    if (!isEmptyVitalsRow(row)) {
      for (const name of names) {
        if (isBlank(row[name])) {
          ctx.addIssue({
            code: "custom",
            path: [name],
            message: `Enter the ${VITALS_LABELS[name]}, or clear this donor's vitals.`,
          })
        }
      }
    }
    if (
      row.bp_systolic !== undefined &&
      row.bp_diastolic !== undefined &&
      row.bp_diastolic >= row.bp_systolic
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["bp_diastolic"],
        message: "Diastolic must be below systolic.",
      })
    }
  })

const issueBloodFields = z.object({
  patient_blood_group: z.enum(BloodGroup).or(z.literal("")),
  amendment_reason: z.string().trim(),
  technologist_id: z.number().optional(),
  physician_id: z.number().optional(),
  units: z
    .array(unitRowSchema)
    .min(1, "Select at least one unit.")
    .max(MAX_ISSUE_UNITS, `At most ${MAX_ISSUE_UNITS} units at once.`),
  post_donation: z.array(vitalsRowSchema),
})

export type IssueBloodValues = z.input<typeof issueBloodFields>
export type IssueBloodOutput = z.output<typeof issueBloodFields>
export type IssueUnitRowValues = IssueBloodValues["units"][number]
export type VitalsRowValues = IssueBloodValues["post_donation"][number]

/** A vitals row with nothing entered: skipped, not sent. */
export function isEmptyVitalsRow(
  row: Pick<
    VitalsRowValues,
    "pulse_bpm" | "bp_systolic" | "bp_diastolic" | "temperature_f"
  >
): boolean {
  return (
    row.pulse_bpm === undefined &&
    row.bp_systolic === undefined &&
    row.bp_diastolic === undefined &&
    row.temperature_f.trim() === ""
  )
}

/** What the form needs to know about the saved state to decide what is required. */
export type IssueBloodContext = {
  /** The patient sample's current blood group; null until one is entered. */
  recordedBloodGroup: BloodGroup | null
  /** Units that already have a current crossmatch: a new one is an amendment. */
  crossmatchedUnitIds?: readonly number[]
  /** The server answered `AMENDMENT_REASON_REQUIRED`: ask for it whatever the form thinks. */
  forceAmendment?: boolean
}

/** A recorded blood group was changed to another one. */
export function bloodGroupChanged(
  selected: BloodGroup | "",
  recorded: BloodGroup | null
): boolean {
  return recorded !== null && selected !== "" && selected !== recorded
}

/**
 * The amendment reason is required when a recorded blood group is changed, or when a unit is
 * crossmatched again (it already has a current crossmatch).
 */
export function amendmentRequired(
  values: Pick<IssueBloodValues, "patient_blood_group" | "units">,
  {
    recordedBloodGroup,
    crossmatchedUnitIds = [],
    forceAmendment = false,
  }: IssueBloodContext
): boolean {
  return (
    forceAmendment ||
    bloodGroupChanged(values.patient_blood_group, recordedBloodGroup) ||
    values.units.some((row) => crossmatchedUnitIds.includes(row.unit_id))
  )
}

export function isIncompatible(
  row: Pick<IssueUnitRowValues, "major_result" | "minor_result">
): boolean {
  return (
    row.major_result === CrossmatchResult.Incompatible ||
    row.minor_result === CrossmatchResult.Incompatible
  )
}

export function issueBloodSchema(context: IssueBloodContext) {
  return issueBloodFields.superRefine((values, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message })

    if (
      context.recordedBloodGroup === null &&
      values.patient_blood_group === ""
    ) {
      issue(["patient_blood_group"], "Select the patient blood group.")
    }

    if (amendmentRequired(values, context)) {
      if (values.amendment_reason === "") {
        issue(["amendment_reason"], "Enter the reason for the change.")
      } else if (values.amendment_reason.length > AMENDMENT_REASON_MAX) {
        issue(
          ["amendment_reason"],
          `At most ${AMENDMENT_REASON_MAX} characters.`
        )
      }
    }

    if (values.technologist_id === undefined) {
      issue(["technologist_id"], "Select the medical technologist.")
    }
    if (values.physician_id === undefined) {
      issue(["physician_id"], "Select the physician.")
    }

    // The backend saves nothing when one unit is incompatible.
    values.units.forEach((row, index) => {
      if (row.major_result === CrossmatchResult.Incompatible) {
        issue(["units", index, "major_result"], INCOMPATIBLE_TEXT)
      }
      if (row.minor_result === CrossmatchResult.Incompatible) {
        issue(["units", index, "minor_result"], INCOMPATIBLE_TEXT)
      }
    })
  })
}

/** The donor a unit was made from: by donor no, else by bag no. */
export function unitDonor(
  donors: readonly IssueDonor[],
  unit: Pick<IssueUnit, "donor_no" | "bag_no">
): IssueDonor | undefined {
  return (
    donors.find(
      (donor) => donor.number !== null && donor.number === unit.donor_no
    ) ??
    donors.find(
      (donor) => donor.bag !== null && donor.bag.bag_no === unit.bag_no
    )
  )
}

/** The case donors the given units come from, in donor order. */
export function donorsOfUnits(
  donors: readonly IssueDonor[],
  units: readonly Pick<IssueUnit, "donor_no" | "bag_no">[]
): IssueDonor[] {
  const matched = new Set(
    units.map((unit) => unitDonor(donors, unit)).filter((donor) => donor)
  )
  return donors.filter((donor) => matched.has(donor))
}

/**
 * Donors of the units whose post-donation vitals are not recorded yet: the form offers
 * (optional) vitals inputs for them.
 */
export function donorsNeedingVitals(
  donors: readonly IssueDonor[],
  units: readonly Pick<IssueUnit, "donor_no" | "bag_no">[]
): IssueDonor[] {
  return donorsOfUnits(donors, units).filter(
    (donor) =>
      donor.needs_post_vitals &&
      !donor.examination?.post &&
      donor.case_donor_id !== null
  )
}

/** Donors of the units whose post-donation vitals are already recorded (shown, not sent). */
export function donorsWithRecordedVitals(
  donors: readonly IssueDonor[],
  units: readonly Pick<IssueUnit, "donor_no" | "bag_no">[]
): IssueDonor[] {
  return donorsOfUnits(donors, units).filter((donor) => donor.examination?.post)
}

/** Units ticked for issue when the screen loads: every one that can be issued. */
export function defaultSelectedUnitIds(view: BloodIssue): number[] {
  return view.units.filter((unit) => unit.can_issue).map((unit) => unit.id)
}

export function emptyVitalsRow(caseDonorId: number): VitalsRowValues {
  return {
    case_donor_id: caseDonorId,
    pulse_bpm: undefined,
    bp_systolic: undefined,
    bp_diastolic: undefined,
    temperature_f: "",
  }
}

/**
 * The form for the selected units: the recorded blood group prefilled, one crossmatch row per
 * unit with nothing chosen, one empty (optional) vitals row per donor without recorded vitals.
 */
export function issueBloodDefaults(
  view: BloodIssue,
  units: readonly IssueUnit[]
): IssueBloodValues {
  return {
    patient_blood_group: view.patient_sample?.blood_group?.value ?? "",
    amendment_reason: "",
    technologist_id: undefined,
    physician_id: undefined,
    units: units.map((unit) => ({
      unit_id: unit.id,
      major_result: "",
      minor_result: "",
      remarks: "",
    })),
    post_donation: donorsNeedingVitals(view.donors, units).flatMap((donor) =>
      donor.case_donor_id === null ? [] : [emptyVitalsRow(donor.case_donor_id)]
    ),
  }
}

/**
 * The request body for validated values; null if a value cannot be read (the schema prevents
 * that). An unchanged recorded blood group is sent as null; the amendment reason only when it
 * is required.
 */
export function toIssueBloodPayload(
  values: IssueBloodOutput,
  context: IssueBloodContext
): IssueBloodInput | null {
  if (
    values.technologist_id === undefined ||
    values.physician_id === undefined
  ) {
    return null
  }

  // The refined choices can no longer be "" here.
  const units = values.units.map((row) => ({
    unit_id: row.unit_id,
    major_result: row.major_result,
    minor_result: row.minor_result,
    remarks: row.remarks === "" ? null : row.remarks,
  }))

  // Only complete rows are sent; an empty row is a donor whose vitals were skipped.
  const postDonation: IssueBloodInput["post_donation"] = []
  for (const row of values.post_donation) {
    if (isEmptyVitalsRow(row)) {
      continue
    }
    const temperature = parseDecimal(row.temperature_f, 1)
    if (
      row.pulse_bpm === undefined ||
      row.bp_systolic === undefined ||
      row.bp_diastolic === undefined ||
      temperature === null
    ) {
      return null
    }
    postDonation.push({
      case_donor_id: row.case_donor_id,
      pulse_bpm: row.pulse_bpm,
      bp_systolic: row.bp_systolic,
      bp_diastolic: row.bp_diastolic,
      temperature_f: temperature,
    })
  }

  const group = values.patient_blood_group
  const unchanged =
    group === "" ||
    (context.recordedBloodGroup !== null &&
      group === context.recordedBloodGroup)

  return {
    technologist_id: values.technologist_id,
    physician_id: values.physician_id,
    patient_blood_group: unchanged ? null : group,
    amendment_reason: amendmentRequired(values, context)
      ? values.amendment_reason
      : null,
    units,
    post_donation: postDonation,
  }
}

/** The reprint form: which reports, and why (every reprint needs a reason). */
export const reprintSchema = z.object({
  unit_ids: z.array(z.number()).min(1, "Select at least one unit."),
  reprint_reason: z
    .string()
    .trim()
    .min(1, "Enter a reason for the reprint.")
    .max(REPRINT_REASON_MAX, `At most ${REPRINT_REASON_MAX} characters.`),
})

export type ReprintValues = z.input<typeof reprintSchema>
export type ReprintOutput = z.output<typeof reprintSchema>
