import type { StorageLocationType } from "@/modules/blood-bank/enums"

/** An active storage location of the session branch (`StorageLocationResource`, dropdown option). */
export type StorageLocation = {
  id: number
  code: string
  name: string
  type: StorageLocationType
  /** Decimal string ("2.00"), as Laravel casts it. */
  min_temperature_c: string | null
  max_temperature_c: string | null
}
