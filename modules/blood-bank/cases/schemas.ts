import { z } from "zod"

import { CareType } from "@/modules/blood-bank/enums"
import {
  BloodGroup,
  Gender,
  MaritalStatus,
  PatientTitle,
} from "@/modules/shared/patient/enums"

/**
 * Registration form for `POST /api/blood-bank/cases`. Field paths equal the request
 * body (`billing.patient.name`, `donors.0.donor.age`) so backend validation errors land
 * on the right field. `patient_mode` and the donor `kind` are UI-only; `api.ts` builds
 * the payload from them.
 */

const text = (max: number) =>
  z.string().trim().max(max, `At most ${max} characters.`)

/** Optional select: "" means not chosen. */
const optionalEnum = <T extends Record<string, string>>(values: T) =>
  z.union([z.enum(values), z.literal("")])

/** "" or `YYYY-MM-DD` (native date input). "Not in the future" is checked by the backend. */
const plainDate = z
  .string()
  .regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")

const wholeNumber = (min: number, max: number) =>
  z
    .number({ error: "Enter a number." })
    .int("Enter a whole number.")
    .min(min, `At least ${min}.`)
    .max(max, `At most ${max}.`)

const id = (message: string) =>
  z.number({ error: message }).int(message).positive(message)

export const PatientMode = {
  New: "new",
  Existing: "existing",
} as const
export type PatientMode = (typeof PatientMode)[keyof typeof PatientMode]

/** Name and age are required only in new-patient mode; checked in `caseCreateSchema`. */
export const newPatientSchema = z.object({
  title: optionalEnum(PatientTitle),
  name: text(255),
  age_years: wholeNumber(0, 150).optional(),
  age_months: wholeNumber(0, 11).optional(),
  age_days: wholeNumber(0, 31).optional(),
  date_of_birth: plainDate,
  gender: optionalEnum(Gender),
  marital_status: optionalEnum(MaritalStatus),
  blood_group: optionalEnum(BloodGroup),
  phone: text(20),
  address: text(1000),
  national_id: text(30),
})

export type NewPatientValues = z.infer<typeof newPatientSchema>

export const emptyNewPatient: NewPatientValues = {
  title: "",
  name: "",
  date_of_birth: "",
  gender: "",
  marital_status: "",
  blood_group: "",
  phone: "",
  address: "",
  national_id: "",
}

export const newDonorSchema = z
  .object({
    name: text(255).min(1, "Enter the donor's name."),
    age: wholeNumber(1, 120).optional(),
    date_of_birth: plainDate,
    gender: optionalEnum(Gender),
    blood_group: optionalEnum(BloodGroup),
    phone: text(20),
    address: text(1000),
    national_id: text(30),
    is_regular_volunteer: z.boolean(),
  })
  .superRefine((donor, ctx) => {
    if (donor.age === undefined && donor.date_of_birth === "") {
      ctx.addIssue({
        code: "custom",
        path: ["age"],
        message: "Enter the age or the date of birth.",
      })
    }
  })

export type NewDonorValues = z.infer<typeof newDonorSchema>

export const emptyNewDonor: NewDonorValues = {
  name: "",
  date_of_birth: "",
  gender: "",
  blood_group: "",
  phone: "",
  address: "",
  national_id: "",
  is_regular_volunteer: false,
}

export const DonorKind = {
  Existing: "existing",
  New: "new",
} as const

export const caseDonorSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal(DonorKind.Existing),
    donor_id: id("Select a donor."),
  }),
  z.object({
    kind: z.literal(DonorKind.New),
    donor: newDonorSchema,
  }),
])

export type CaseDonorValues = z.infer<typeof caseDonorSchema>

export const testLineSchema = z.object({
  test_item_id: id("Enter the test item ID."),
  quantity: wholeNumber(1, 999),
})

export const componentLineSchema = z.object({
  component_type_id: id("Enter the component type ID."),
  quantity: wholeNumber(1, 20),
})

/** Adds an issue on every repeated id after its first row, so the duplicate row is highlighted. */
function flagDuplicates(
  ctx: z.RefinementCtx,
  rows: readonly Record<string, unknown>[],
  arrayPath: (string | number)[],
  key: string,
  message: string
) {
  const seen = new Set<unknown>()
  rows.forEach((row, index) => {
    const value = row[key]
    if (value === undefined) {
      return
    }
    if (seen.has(value)) {
      ctx.addIssue({
        code: "custom",
        path: [...arrayPath, index, key],
        message,
      })
    }
    seen.add(value)
  })
}

export const caseCreateSchema = z
  .object({
    patient_mode: z.enum(PatientMode),
    billing: z.object({
      patient_id: z.number().int().positive().optional(),
      patient: newPatientSchema,
      items: z.array(testLineSchema).min(1, "Add at least one test."),
      referral: z.object({
        is_self_referral: z.boolean(),
        doctor_id: id("Enter the doctor ID.").optional(),
        second_doctor_id: id("Enter a valid doctor ID.").optional(),
        remark: text(255),
        referred_by_staff_id: id("Enter a valid staff ID.").optional(),
      }),
    }),
    care_type: z.enum(CareType, { error: "Select care type." }),
    transfusion_reason: text(1000),
    reference_note: text(1000),
    components: z.array(componentLineSchema),
    donors: z.array(caseDonorSchema),
  })
  .superRefine((values, ctx) => {
    const { billing } = values

    if (values.patient_mode === PatientMode.Existing) {
      if (billing.patient_id === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["billing", "patient_id"],
          message: "Select a patient.",
        })
      }
    } else {
      if (billing.patient.name === "") {
        ctx.addIssue({
          code: "custom",
          path: ["billing", "patient", "name"],
          message: "Enter the patient's name.",
        })
      }
      if (
        billing.patient.age_years === undefined &&
        billing.patient.date_of_birth === ""
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["billing", "patient", "age_years"],
          message: "Enter the age or the date of birth.",
        })
      }
    }

    const { referral } = billing
    if (!referral.is_self_referral && referral.doctor_id === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["billing", "referral", "doctor_id"],
        message: "Enter the doctor ID, or mark as self referral.",
      })
    }
    if (
      referral.second_doctor_id !== undefined &&
      !referral.is_self_referral &&
      referral.second_doctor_id === referral.doctor_id
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["billing", "referral", "second_doctor_id"],
        message: "Must differ from the referring doctor.",
      })
    }

    flagDuplicates(
      ctx,
      billing.items,
      ["billing", "items"],
      "test_item_id",
      "This test is already listed."
    )
    flagDuplicates(
      ctx,
      values.components,
      ["components"],
      "component_type_id",
      "This component is already listed."
    )
    flagDuplicates(
      ctx,
      values.donors,
      ["donors"],
      "donor_id",
      "This donor is already listed."
    )
  })

export type CaseCreateValues = z.infer<typeof caseCreateSchema>
