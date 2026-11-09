import type { TestItemCategory } from "@/modules/shared/test-catalog/enums"

/**
 * `TestItemResource` (lookup row). `rate` is integer paisa, for display only; the bill snapshots
 * it. `category` decides the kind of bill (Blood Bank items are never billed with others).
 * `discount_percent` is the item's own discount rate under a discount policy (null follows the
 * policy, 0 is never discounted).
 */
export type TestItem = {
  id: number
  code: string
  name: string
  department_id: number
  department_name: string | null
  category: TestItemCategory
  rate: number
  discount_percent: number | null
}
