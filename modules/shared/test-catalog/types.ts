import type { TestItemCategory } from "@/modules/shared/test-catalog/enums"

/**
 * `TestItemResource` (lookup row). `rate` is integer paisa, for display only; the bill snapshots
 * it. `category` says which module the item also belongs to (a Blood Bank item opens the bill's
 * Blood Bank case); items of any category may share one bill.
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
