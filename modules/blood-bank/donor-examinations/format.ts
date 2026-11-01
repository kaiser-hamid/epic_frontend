/** Hemoglobin under this is only flagged as a soft hint; the decision stays the physician's. */
export const LOW_HEMOGLOBIN_G_DL = 12.5

/** Typed text → number; null unless it is digits with at most `maxDecimals` decimals. */
export function parseDecimal(text: string, maxDecimals: number): number | null {
  const trimmed = text.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return null
  }
  const decimals = trimmed.split(".")[1]?.length ?? 0
  return decimals > maxDecimals ? null : Number(trimmed)
}

/** "120/80" → systolic and diastolic; null for anything else. */
export function parseBloodPressure(
  text: string
): { systolic: number; diastolic: number } | null {
  const match = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec(text.trim())
  if (!match) {
    return null
  }
  return { systolic: Number(match[1]), diastolic: Number(match[2]) }
}
