/** Mirrors the backend `Modules\Shared\TestCatalog\Enums\TestItemCategory`. Values must match exactly. */
export const TestItemCategory = {
  General: "general",
  BloodBank: "blood_bank",
} as const

export type TestItemCategory =
  (typeof TestItemCategory)[keyof typeof TestItemCategory]

export const testItemCategoryLabels: Record<TestItemCategory, string> = {
  general: "General",
  blood_bank: "Blood Bank",
}
