/** `DoctorResource` (lookup row). */
export type Doctor = {
  id: number
  code: string
  name: string
  degree: string | null
  address: string | null
  phone: string | null
}
