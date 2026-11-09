import { z } from "zod"

import {
  flagDuplicates,
  id,
  optionalEnum,
  phone,
  plainDate,
  text,
  wholeNumber,
} from "@/lib/form-schemas"
import { localDateTimeToIso, todayIsoDate } from "@/lib/format"
import {
  BloodGroup,
  Gender,
  MaritalStatus,
  PatientTitle,
} from "@/modules/shared/patient/enums"
import type { Patient } from "@/modules/shared/patient/types"
import { TestItemCategory } from "@/modules/shared/test-catalog/enums"
import type { TestItem } from "@/modules/shared/test-catalog/types"

/**
 * New Bill Entry form for `POST /api/billing/invoices`. Field paths equal the request body
 * (`patient.name`, `items.0.test_item_id`, `category_details.care_type`) so backend validation
 * errors land on the right field. A returning patient is found by phone: its id is set and its
 * fields are filled read-only; `api.ts` then sends only the id.
 */

/** Name and age are required only for a new patient; checked in `invoiceSchema`. */
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

export const testLineSchema = z.object({
  test_item_id: id("Select a test."),
  quantity: wholeNumber(1, 999),
  /** The looked-up item, for display (department, rate, category) only; never sent. */
  item: z.custom<TestItem>().optional(),
})

export type TestLineValues = z.infer<typeof testLineSchema>

/** Counter amounts are typed in whole taka: the payable always is (it is rounded to 10 taka). */
export const MAX_TAKA = 100_000_000

/**
 * `datetime-local` value read as Asia/Dhaka time; required, today or later (the server checks
 * the same).
 */
export const deliveryAt = z.string().superRefine((value, ctx) => {
  if (localDateTimeToIso(value) === null) {
    ctx.addIssue({
      code: "custom",
      message: "Enter the delivery date and time.",
    })
  } else if (value.slice(0, 10) < todayIsoDate()) {
    ctx.addIssue({ code: "custom", message: "Can't be before today." })
  }
})

export const invoiceSchema = z
  .object({
    /** A vendor invoice no typed by staff; "" lets the server number the bill. */
    invoice_no: text(30).regex(/^[A-Za-z0-9]*$/, "Letters and digits only."),
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
    patient_type_id: id("Select the patient type."),
    discount_policy_id: id("Select a discount.").optional(),
    delivery_at: deliveryAt,
    /** Taka the patient pays now; follows the payable until edited. Sent in paisa. */
    paid_amount: wholeNumber(0, MAX_TAKA),
    /** Taka handed over, only to show the change; never sent. */
    given_amount: wholeNumber(0, MAX_TAKA).optional(),
    /**
     * Fields the bill's category asks for (Blood Bank: `care_type`), rendered by that module.
     * Validated by the server, which answers on `category_details.*`.
     */
    category_details: z.record(z.string(), z.string().optional()),
  })
  .superRefine((values, ctx) => {
    if (values.patient_id === undefined) {
      if (values.patient.name === "") {
        ctx.addIssue({
          code: "custom",
          path: ["patient", "name"],
          message: "Enter the patient's name.",
        })
      }
      if (
        values.patient.age_years === undefined &&
        values.patient.date_of_birth === ""
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["patient", "age_years"],
          message: "Enter the age or the date of birth.",
        })
      }
    }

    const { referral } = values
    if (!referral.is_self_referral && referral.doctor_id === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["referral", "doctor_id"],
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
        path: ["referral", "second_doctor_id"],
        message: "Must differ from the referring doctor.",
      })
    }

    flagDuplicates(
      ctx,
      values.items,
      ["items"],
      "test_item_id",
      "This test is already listed."
    )
  })

export type InvoiceValues = z.infer<typeof invoiceSchema>

export const emptyInvoiceValues: InvoiceValues = {
  invoice_no: "",
  patient: emptyNewPatient,
  items: [{ quantity: 1 } as TestLineValues],
  referral: { is_self_referral: false, remark: "" },
  patient_type_id: undefined as unknown as number,
  delivery_at: "",
  paid_amount: undefined as unknown as number,
  category_details: {},
}

/**
 * The bill's category, from the picked items: Blood Bank as soon as one Blood Bank item is on
 * it (the form never keeps other items next to one), otherwise general.
 */
export function invoiceCategory(
  lines: readonly Partial<TestLineValues>[]
): TestItemCategory {
  return lines.some(
    (line) => line.item?.category === TestItemCategory.BloodBank
  )
    ? TestItemCategory.BloodBank
    : TestItemCategory.General
}
