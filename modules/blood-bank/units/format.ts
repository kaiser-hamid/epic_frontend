import type {
  PreparationComponent,
  Unit,
} from "@/modules/blood-bank/units/types"

/** Units expiring within this many days are highlighted. */
export const EXPIRY_WARNING_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

/** Expires within `EXPIRY_WARNING_DAYS` from `now`, or has already expired. */
export function isExpiringSoon(expiresAt: string, now = Date.now()): boolean {
  return Date.parse(expiresAt) - now <= EXPIRY_WARNING_DAYS * DAY_MS
}

/** "PCV: billed 1, held 0, needed 1". */
export function componentHeldText(component: PreparationComponent): string {
  return `${component.code}: billed ${component.quantity}, held ${component.held_count}, needed ${component.needed_count}`
}

/** Where a unit is kept: its storage location, or "With patient's case" for a patient unit stored without one. */
export function storageText(unit: Unit): string {
  return (
    unit.storage_location?.name ??
    (unit.reserved_for ? "With patient's case" : "—")
  )
}
