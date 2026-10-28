import { apiClient } from "@/lib/api-client"
import type {
  ListParams,
  PaginatedResponse,
  ResourceResponse,
} from "@/lib/api-types"
import { emptyToNull } from "@/lib/utils"
import {
  DonorKind,
  PatientMode,
  type CaseCreateValues,
  type NewDonorValues,
  type NewPatientValues,
} from "@/modules/blood-bank/cases/schemas"
import type {
  BloodBankCase,
  CaseFilters,
} from "@/modules/blood-bank/cases/types"

const basePath = "/api/blood-bank/cases"

export type CaseListParams = Omit<ListParams, "filter" | "include"> & {
  filter?: CaseFilters
}

/** Newest first by default. The endpoint takes no `include`; rows always embed patient and invoice. */
export async function listCases(
  params: CaseListParams
): Promise<PaginatedResponse<BloodBankCase>> {
  const response = await apiClient.get<PaginatedResponse<BloodBankCase>>(
    basePath,
    { params }
  )
  return response.data
}

export async function getCase(id: number): Promise<BloodBankCase> {
  const response = await apiClient.get<ResourceResponse<BloodBankCase>>(
    `${basePath}/${id}`
  )
  return response.data.data
}

function newPatientPayload(patient: NewPatientValues) {
  return {
    title: patient.title || null,
    name: patient.name.trim(),
    age_years: patient.age_years,
    age_months: patient.age_months,
    age_days: patient.age_days,
    date_of_birth: patient.date_of_birth || null,
    gender: patient.gender || null,
    marital_status: patient.marital_status || null,
    blood_group: patient.blood_group || null,
    phone: emptyToNull(patient.phone),
    address: emptyToNull(patient.address),
    national_id: emptyToNull(patient.national_id),
  }
}

function newDonorPayload(donor: NewDonorValues) {
  return {
    name: donor.name.trim(),
    age: donor.age,
    date_of_birth: donor.date_of_birth || null,
    gender: donor.gender || null,
    blood_group: donor.blood_group || null,
    phone: emptyToNull(donor.phone),
    address: emptyToNull(donor.address),
    national_id: emptyToNull(donor.national_id),
    is_regular_volunteer: donor.is_regular_volunteer,
  }
}

/**
 * Form values → request body. Sends exactly one of `patient_id` / `patient`, no
 * `doctor_id` on a self referral, and `donor_id` or `donor` per donor. Empty optional
 * numbers stay `undefined` and are dropped from the JSON.
 */
export function toRegisterCasePayload(values: CaseCreateValues) {
  const { billing } = values
  const { referral } = billing

  return {
    billing: {
      ...(values.patient_mode === PatientMode.Existing
        ? { patient_id: billing.patient_id }
        : { patient: newPatientPayload(billing.patient) }),
      items: billing.items,
      referral: {
        is_self_referral: referral.is_self_referral,
        doctor_id: referral.is_self_referral ? undefined : referral.doctor_id,
        second_doctor_id: referral.second_doctor_id,
        remark: emptyToNull(referral.remark),
        referred_by_staff_id: referral.referred_by_staff_id,
      },
    },
    care_type: values.care_type,
    transfusion_reason: emptyToNull(values.transfusion_reason),
    reference_note: emptyToNull(values.reference_note),
    components: values.components,
    donors: values.donors.map((entry) =>
      entry.kind === DonorKind.Existing
        ? { donor_id: entry.donor_id }
        : { donor: newDonorPayload(entry.donor) }
    ),
  }
}

/** Registers patient (if new), invoice, case, components and donors in one transaction. */
export async function createCase(
  values: CaseCreateValues
): Promise<BloodBankCase> {
  const response = await apiClient.post<ResourceResponse<BloodBankCase>>(
    basePath,
    toRegisterCasePayload(values)
  )
  return response.data.data
}
