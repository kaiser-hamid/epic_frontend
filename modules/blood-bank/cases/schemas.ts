import { z } from "zod"

import {
  optionalEnum,
  phone,
  plainDate,
  text,
  wholeNumber,
} from "@/lib/form-schemas"
import type { Donor } from "@/modules/blood-bank/donors/types"
import { CareType, Religion } from "@/modules/blood-bank/enums"
import {
  BloodGroup,
  Gender,
  MaritalStatus,
} from "@/modules/shared/patient/enums"

/**
 * Case forms. A case is opened by saving a Blood Bank bill (New Bill Entry); here the case's
 * own details are edited and donors are added. A returning donor is found by phone: its id is
 * set and its fields are filled read-only; `api.ts` then sends only the id.
 */

/** Name and age are required only for a new donor; checked by `checkNewDonor`. */
export const newDonorSchema = z.object({
  name: text(255),
  age: wholeNumber(1, 120).optional(),
  date_of_birth: plainDate,
  gender: optionalEnum(Gender),
  blood_group: optionalEnum(BloodGroup),
  phone,
  address: text(1000),
  national_id: text(30),
  father_name: text(255),
  marital_status: optionalEnum(MaritalStatus),
  religion: optionalEnum(Religion),
  occupation: text(100),
  /** "Would you like to be a regular voluntary donor?": yes, no, or null (not asked). */
  is_regular_volunteer: z.boolean().nullable(),
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
  father_name: "",
  marital_status: "",
  religion: "",
  occupation: "",
  is_regular_volunteer: null,
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
    father_name: donor.father_name ?? "",
    marital_status: donor.marital_status ?? "",
    religion: donor.religion ?? "",
    occupation: donor.occupation ?? "",
    is_regular_volunteer: donor.is_regular_volunteer,
  }
}

/** `donor_id` set = returning donor (only the id is sent); otherwise `donor` is registered. */
export const caseDonorSchema = z.object({
  donor_id: z.number().int().positive().optional(),
  donor: newDonorSchema,
})

export type CaseDonorValues = z.infer<typeof caseDonorSchema>

export const emptyCaseDonor: CaseDonorValues = { donor: emptyNewDonor }

/** A form holding donor entries at `donors.N` (Add donor), as `CaseDonorEntry` expects. */
export type DonorsFormValues = { donors: CaseDonorValues[] }

/**
 * A new donor (no `donor_id`) needs a name and an age or date of birth. `path` is the entry's
 * path (`["donors", 0]`).
 */
export function checkNewDonor(
  ctx: z.RefinementCtx,
  entry: CaseDonorValues,
  path: (string | number)[]
) {
  if (entry.donor_id !== undefined) {
    return
  }
  if (entry.donor.name === "") {
    ctx.addIssue({
      code: "custom",
      path: [...path, "donor", "name"],
      message: "Enter the donor's name.",
    })
  }
  if (entry.donor.age === undefined && entry.donor.date_of_birth === "") {
    ctx.addIssue({
      code: "custom",
      path: [...path, "donor", "age"],
      message: "Enter the age or the date of birth.",
    })
  }
}

/** The case's own details, edited on the case screen (`PATCH /cases/{id}`, dirty fields only). */
export const caseDetailsSchema = z.object({
  care_type: z.enum(CareType, { error: "Select care type." }),
  transfusion_reason: text(1000),
  reference_note: text(1000),
})

export type CaseDetailsValues = z.infer<typeof caseDetailsSchema>
