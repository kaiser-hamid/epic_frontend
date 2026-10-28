import type { BloodGroup, Gender } from "@/modules/shared/patient/enums"

/** `bb_donors` as returned by `DonorResource`. */
export type Donor = {
  id: number
  donor_no: string
  name: string
  age: number | null
  date_of_birth: string | null
  gender: Gender | null
  blood_group: BloodGroup | null
  phone: string | null
  address: string | null
  national_id: string | null
  is_regular_volunteer: boolean | null
  created_at: string
}
