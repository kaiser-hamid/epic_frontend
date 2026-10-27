import type { FieldValues } from "react-hook-form"

/**
 * Top-level fields the user changed, for PATCH requests (backend `Optional|type`).
 * Pass `form.formState.dirtyFields`.
 */
export function pickDirty<TValues extends FieldValues>(
  values: TValues,
  dirtyFields: Partial<Record<keyof TValues, unknown>>
): Partial<TValues> {
  const changes: Partial<TValues> = {}
  for (const key of Object.keys(dirtyFields) as Array<keyof TValues>) {
    if (dirtyFields[key]) {
      changes[key] = values[key]
    }
  }
  return changes
}
