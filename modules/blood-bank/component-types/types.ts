/** `bb_component_types` master data: WB, PCV, FP, CRYO, PLATELET, … */
export type ComponentType = {
  id: number
  code: string
  name: string
  shelf_life_hours: number
  is_active: boolean
}
