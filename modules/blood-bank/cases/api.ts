import { apiClient } from "@/lib/api-client"
import type {
  ListParams,
  PaginatedResponse,
  ResourceResponse,
} from "@/lib/api-types"
import { emptyToNull } from "@/lib/utils"
import type {
  CaseDetailsValues,
  NewDonorValues,
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

/** A new donor for a request body (Add donor). */
export function newDonorPayload(donor: NewDonorValues) {
  return {
    name: donor.name.trim(),
    age: donor.age,
    date_of_birth: donor.date_of_birth || null,
    gender: donor.gender || null,
    blood_group: donor.blood_group || null,
    phone: emptyToNull(donor.phone),
    address: emptyToNull(donor.address),
    national_id: emptyToNull(donor.national_id),
    father_name: emptyToNull(donor.father_name),
    marital_status: donor.marital_status || null,
    religion: donor.religion || null,
    occupation: emptyToNull(donor.occupation),
    is_regular_volunteer: donor.is_regular_volunteer,
  }
}

/** Changed details → body: only the fields sent, empty texts as null. */
export function toUpdateCasePayload(changes: Partial<CaseDetailsValues>) {
  return {
    care_type: changes.care_type,
    transfusion_reason:
      changes.transfusion_reason === undefined
        ? undefined
        : emptyToNull(changes.transfusion_reason),
    reference_note:
      changes.reference_note === undefined
        ? undefined
        : emptyToNull(changes.reference_note),
  }
}

export type UpdateCaseInput = {
  id: number
  changes: Partial<CaseDetailsValues>
}

/** Corrects "Care of" and records the cause of transfusion / reference note of an open case. */
export async function updateCase({
  id,
  changes,
}: UpdateCaseInput): Promise<BloodBankCase> {
  const response = await apiClient.patch<ResourceResponse<BloodBankCase>>(
    `${basePath}/${id}`,
    toUpdateCasePayload(changes)
  )
  return response.data.data
}
