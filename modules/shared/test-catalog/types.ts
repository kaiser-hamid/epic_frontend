/** `TestItemResource` (lookup row). `rate` is integer paisa, for display only; the bill snapshots it. */
export type TestItem = {
  id: number
  code: string
  name: string
  department_id: number
  department_name: string | null
  rate: number
}
