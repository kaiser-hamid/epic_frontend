/** `sh_patient_master` as returned by the patient resource. */
export type Patient = {
  id: number
  patient_no: string
  name: string
  age: number | null
  gender: "male" | "female" | "other" | null
  blood_group: string | null
  phone: string | null
}
