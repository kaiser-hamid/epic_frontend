import { z } from "zod"

import type { Donor } from "@/modules/blood-bank/donors/types"
import { CareType } from "@/modules/blood-bank/enums"
import {
  BloodGroup,
  Gender,
  MaritalStatus,
  PatientTitle,
} from "@/modules/shared/patient/enums"
import type { Patient } from "@/modules/shared/patient/types"
import type { TestItem } from "@/modules/shared/test-catalog/types"

/**
 * Registration form for `POST /api/blood-bank/cases`. Field paths equal the request
 * body (`billing.patient.name`, `donors.0.donor.age`) so backend validation errors land
 * on the right field. A returning patient or donor is found by phone: its id is set and
 * its fields are filled read-only; `api.ts` then sends only the id.
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

/** Digits only (the input drops anything else); "" when not given. */
const phone = z
  .string()
  .regex(/^\d*$/, "Enter digits only.")
  .max(20, "At most 20 digits.")

const wholeNumber = (min: number, max: number) =>
  z
    .number({ error: "Enter a number." })
    .int("Enter a whole number.")
    .min(min, `At least ${min}.`)
    .max(max, `At most ${max}.`)

const id = (message: string) =>
  z.number({ error: message }).int(message).positive(message)

/** Name and age are required only for a new patient; checked in `caseCreateSchema`. */
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
  phone,
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

/** A found patient, shown read-only in the form. */
export function patientFormValues(patient: Patient): NewPatientValues {
  return {
    title: patient.title ?? "",
    name: patient.name,
    age_years: patient.age_years ?? undefined,
    age_months: patient.age_months ?? undefined,
    age_days: patient.age_days ?? undefined,
    date_of_birth: patient.date_of_birth ?? "",
    gender: patient.gender ?? "",
    marital_status: patient.marital_status ?? "",
    blood_group: patient.blood_group ?? "",
    phone: patient.phone ?? "",
    address: patient.address ?? "",
    national_id: patient.national_id ?? "",
  }
}

/** Name and age are required only for a new donor; checked in `caseCreateSchema`. */
export const newDonorSchema = z.object({
  name: text(255),
  age: wholeNumber(1, 120).optional(),
  date_of_birth: plainDate,
  gender: optionalEnum(Gender),
  blood_group: optionalEnum(BloodGroup),
  phone,
  address: text(1000),
  national_id: text(30),
  is_regular_volunteer: z.boolean(),
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

/** A found donor, shown read-only in the form. */
export function donorFormValues(donor: Donor): NewDonorValues {
  return {
    name: donor.name,
    age: donor.age ?? undefined,
    date_of_birth: donor.date_of_birth ?? "",
    gender: donor.gender ?? "",
    blood_group: donor.blood_group ?? "",
    phone: donor.phone ?? "",
    address: donor.address ?? "",
    national_id: donor.national_id ?? "",
    is_regular_volunteer: donor.is_regular_volunteer ?? false,
  }
}

/** `donor_id` set = returning donor (only the id is sent); otherwise `donor` is registered. */
export const caseDonorSchema = z.object({
  donor_id: z.number().int().positive().optional(),
  donor: newDonorSchema,
})

export type CaseDonorValues = z.infer<typeof caseDonorSchema>

export const emptyCaseDonor: CaseDonorValues = { donor: emptyNewDonor }

export const testLineSchema = z.object({
  test_item_id: id("Select a test."),
  quantity: wholeNumber(1, 999),
  /** The looked-up item, for display (department, rate, amount) only; never sent. */
  item: z.custom<TestItem>().optional(),
})

/** Quantity is not asked yet; `api.ts` sends a fixed one. */
export const componentLineSchema = z.object({
  component_type_id: id("Select a component."),
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
    billing: z.object({
      /** Set when the phone lookup found the patient. */
      patient_id: z.number().int().positive().optional(),
      patient: newPatientSchema,
      items: z.array(testLineSchema).min(1, "Add at least one test."),
      referral: z.object({
        is_self_referral: z.boolean(),
        doctor_id: id("Select a doctor.").optional(),
        second_doctor_id: id("Select a doctor.").optional(),
        remark: text(255),
        referred_by_staff_id: id("Select a staff member.").optional(),
      }),
    }),
    care_type: z.enum(CareType, { error: "Select care type." }),
    transfusion_reason: text(1000),
    reference_note: text(1000),
    components: z.array(componentLineSchema),
    donors: z.array(caseDonorSchema).min(1, "Add at least one donor."),
  })
  .superRefine((values, ctx) => {
    const { billing } = values

    if (billing.patient_id === undefined) {
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
        message: "Select the referring doctor, or mark as self referral.",
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

    values.donors.forEach((entry, index) => {
      if (entry.donor_id !== undefined) {
        return
      }
      if (entry.donor.name === "") {
        ctx.addIssue({
          code: "custom",
          path: ["donors", index, "donor", "name"],
          message: "Enter the donor's name.",
        })
      }
      if (entry.donor.age === undefined && entry.donor.date_of_birth === "") {
        ctx.addIssue({
          code: "custom",
          path: ["donors", index, "donor", "age"],
          message: "Enter the age or the date of birth.",
        })
      }
    })

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
