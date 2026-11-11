import type { Designation } from "@/modules/shared/auth/enums"

/** `StaffResource` (lookup row). `id` is the user id. */
export type Staff = {
  id: number
  employee_id: string
  name: string
  designation: Designation | null
}
