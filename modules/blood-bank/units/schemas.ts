import { z } from "zod"

import { localDateTimeToIso } from "@/lib/format"
import type { ComponentType } from "@/modules/blood-bank/component-types/types"
import {
  WHOLE_BLOOD_CODE,
  type ComponentPreparation,
  type PreparationComponent,
  type PrepareUnitsInput,
} from "@/modules/blood-bank/units/types"

/**
 * The "Prepare" form for one bag: keep it as one whole-blood unit, or separate it into 1–6
 * components. What the patient gets must match what the case was billed for and still needs
 * (`needed_count`), as `PrepareUnits::ensureMatchesCaseRequirement` checks:
 *  - whole blood needed (and no component): kept as whole blood, for the patient;
 *  - components needed (no whole blood): separated, one patient unit of each needed component;
 *  - both needed: staff choose which of the two;
 *  - nothing needed: either mode, every unit to stock.
 * The patient rows the requirement dictates are pre-filled and locked. A patient unit's storage
 * location is optional; a stock unit needs one. `prepared_at` is a `YYYY-MM-DDTHH:mm` Asia/Dhaka
 * wall time; empty leaves it to the server (now).
 */

export const MAX_UNITS = 6
export const UNIT_VOLUME_ML = { min: 1, max: 600 } as const

export const PreparationMode = {
  WholeBlood: "whole_blood",
  Separate: "separate",
} as const
export type PreparationMode =
  (typeof PreparationMode)[keyof typeof PreparationMode]

export const preparationModeLabels: Record<PreparationMode, string> = {
  whole_blood: "Keep as whole blood",
  separate: "Separate into components",
}

// The ids start empty in the form; the object-level check below reports them as required.
const unitRowSchema = z.object({
  component_type_id: z.number().int().positive().optional(),
  storage_location_id: z.number().int().positive().optional(),
  volume_ml: z
    .number()
    .int("Enter a whole number.")
    .min(UNIT_VOLUME_ML.min, `At least ${UNIT_VOLUME_ML.min} ml.`)
    .max(UNIT_VOLUME_ML.max, `At most ${UNIT_VOLUME_ML.max} ml.`)
    .optional(),
  for_case: z.boolean(),
  /** A patient row the requirement dictates: its component and switch can't change. UI only. */
  locked: z.boolean(),
})

export type UnitRowValues = z.input<typeof unitRowSchema>

/** How many more units of a component the case needs (0 when it was never billed). */
export function neededCount(
  components: readonly PreparationComponent[],
  componentTypeId: number | undefined
): number {
  return (
    components.find(
      (component) => component.component_type_id === componentTypeId
    )?.needed_count ?? 0
  )
}

export const RequirementKind = {
  /** Whole blood is needed and no other component is. */
  WholeBlood: "whole_blood",
  /** Components are needed, whole blood isn't. */
  Components: "components",
  /** Whole blood and a component are both needed: staff choose. */
  Either: "either",
  /** Nothing is needed: everything goes to stock. */
  None: "none",
} as const
export type RequirementKind =
  (typeof RequirementKind)[keyof typeof RequirementKind]

export type PreparationRequirement = {
  kind: RequirementKind
  wholeBloodNeeded: boolean
  /** Non-whole-blood components with `needed_count > 0`, in billing order. */
  neededComponents: PreparationComponent[]
  /** The modes staff may pick; one means the mode is forced. */
  modes: PreparationMode[]
}

export function preparationRequirement(
  components: readonly PreparationComponent[],
  wholeBlood: ComponentType | undefined
): PreparationRequirement {
  const needed = components.filter((component) => component.needed_count > 0)
  const wholeBloodNeeded = needed.some(
    (component) =>
      component.component_type_id === wholeBlood?.id ||
      component.code === WHOLE_BLOOD_CODE
  )
  const neededComponents = needed.filter(
    (component) =>
      component.component_type_id !== wholeBlood?.id &&
      component.code !== WHOLE_BLOOD_CODE
  )
  const both = [PreparationMode.WholeBlood, PreparationMode.Separate]

  if (wholeBloodNeeded && neededComponents.length === 0) {
    return {
      kind: RequirementKind.WholeBlood,
      wholeBloodNeeded,
      neededComponents,
      modes: [PreparationMode.WholeBlood],
    }
  }
  if (neededComponents.length > 0 && !wholeBloodNeeded) {
    return {
      kind: RequirementKind.Components,
      wholeBloodNeeded,
      neededComponents,
      modes: [PreparationMode.Separate],
    }
  }
  return {
    kind: wholeBloodNeeded ? RequirementKind.Either : RequirementKind.None,
    wholeBloodNeeded,
    neededComponents,
    modes: both,
  }
}

/** "For this patient" is offered only for a component the case still needs. */
export function canShowReserve(
  components: readonly PreparationComponent[],
  componentTypeId: number | undefined
): boolean {
  return neededCount(components, componentTypeId) > 0
}

/**
 * Whether row `index`'s switch can be changed: not a locked row, and turning it on must not
 * reserve more of its component than the case still needs. A row already on can be turned off.
 */
export function canToggleReserve(
  components: readonly PreparationComponent[],
  rows: readonly Pick<
    UnitRowValues,
    "component_type_id" | "for_case" | "locked"
  >[],
  index: number
): boolean {
  const row = rows[index]
  if (
    !row ||
    row.locked ||
    !canShowReserve(components, row.component_type_id)
  ) {
    return false
  }
  if (row.for_case) {
    return true
  }
  const othersReserved = rows.filter(
    (other, otherIndex) =>
      otherIndex !== index &&
      other.for_case &&
      other.component_type_id === row.component_type_id
  ).length
  return neededCount(components, row.component_type_id) - othersReserved > 0
}

export function prepareUnitsSchema({
  components,
  collectedAt,
  wholeBloodId,
}: {
  components: readonly PreparationComponent[]
  /** The bag's `collected_at` (ISO 8601): units can't be prepared before it. */
  collectedAt: string
  wholeBloodId: number | undefined
}) {
  return z
    .object({
      mode: z.enum([PreparationMode.WholeBlood, PreparationMode.Separate]),
      units: z
        .array(unitRowSchema)
        .min(1, "Add at least one component.")
        .max(MAX_UNITS, `At most ${MAX_UNITS} units from one bag.`),
      prepared_at: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.prepared_at !== "") {
        const iso = localDateTimeToIso(values.prepared_at)
        if (iso === null) {
          ctx.addIssue({
            code: "custom",
            path: ["prepared_at"],
            message: "Enter a date and time.",
          })
        } else if (Date.parse(iso) > Date.now()) {
          ctx.addIssue({
            code: "custom",
            path: ["prepared_at"],
            message: "Can't be in the future.",
          })
        } else if (Date.parse(iso) < Date.parse(collectedAt)) {
          ctx.addIssue({
            code: "custom",
            path: ["prepared_at"],
            message: "Can't be before the blood was collected.",
          })
        }
      }

      const hasWholeBlood = values.units.some(
        (row) =>
          wholeBloodId !== undefined && row.component_type_id === wholeBloodId
      )
      if (hasWholeBlood && values.units.length > 1) {
        ctx.addIssue({
          code: "custom",
          path: ["units"],
          message: "Whole blood can't be combined with components.",
        })
      }

      const reserved = new Map<number, number>()
      values.units.forEach((row, index) => {
        if (row.component_type_id === undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["units", index, "component_type_id"],
            message: "Choose a component.",
          })
        }
        if (!row.for_case && row.storage_location_id === undefined) {
          ctx.addIssue({
            code: "custom",
            path: ["units", index, "storage_location_id"],
            message: "A stock unit needs a storage location.",
          })
        }
        if (!row.for_case || row.component_type_id === undefined) {
          return
        }
        const count = (reserved.get(row.component_type_id) ?? 0) + 1
        reserved.set(row.component_type_id, count)
        if (count > neededCount(components, row.component_type_id)) {
          ctx.addIssue({
            code: "custom",
            path: ["units", index, "for_case"],
            message: "The case doesn't need more of this component.",
          })
        }
      })
    })
}

export type PrepareUnitsValues = z.input<ReturnType<typeof prepareUnitsSchema>>
export type PrepareUnitsOutput = z.output<ReturnType<typeof prepareUnitsSchema>>

export function emptyUnitRow(): UnitRowValues {
  return {
    component_type_id: undefined,
    storage_location_id: undefined,
    volume_ml: undefined,
    for_case: false,
    locked: false,
  }
}

/** The single whole-blood row: locked for the patient when the case needs whole blood. */
export function wholeBloodRow(
  requirement: PreparationRequirement,
  wholeBlood: ComponentType
): UnitRowValues {
  return {
    ...emptyUnitRow(),
    component_type_id: wholeBlood.id,
    for_case: requirement.wholeBloodNeeded,
    locked: requirement.wholeBloodNeeded,
  }
}

/**
 * The rows to separate into: one locked patient row per needed component, or one blank stock
 * row when none is needed.
 */
export function separateRows(
  requirement: PreparationRequirement
): UnitRowValues[] {
  const rows = requirement.neededComponents
    .slice(0, MAX_UNITS)
    .map((component) => ({
      ...emptyUnitRow(),
      component_type_id: component.component_type_id,
      for_case: true,
      locked: true,
    }))
  return rows.length > 0 ? rows : [emptyUnitRow()]
}

/** The form for a mode: its pre-filled rows. */
export function rowsForMode(
  mode: PreparationMode,
  requirement: PreparationRequirement,
  wholeBlood: ComponentType | undefined
): UnitRowValues[] {
  return mode === PreparationMode.WholeBlood && wholeBlood
    ? [wholeBloodRow(requirement, wholeBlood)]
    : separateRows(requirement)
}

/**
 * The forced mode, else whole blood when that is needed ("either"), else separate. Without a
 * whole-blood component type the bag can only be separated.
 */
export function defaultPrepareValues(
  requirement: PreparationRequirement,
  wholeBlood: ComponentType | undefined
): PrepareUnitsValues {
  const mode =
    wholeBlood && requirement.modes[0] === PreparationMode.WholeBlood
      ? PreparationMode.WholeBlood
      : PreparationMode.Separate
  return {
    mode,
    units: rowsForMode(mode, requirement, wholeBlood),
    prepared_at: "",
  }
}

export function findWholeBlood(
  componentTypes: readonly ComponentType[]
): ComponentType | undefined {
  return componentTypes.find((type) => type.code === WHOLE_BLOOD_CODE)
}

/** Ties a form to the requirement it was pre-filled for; a change remounts it. */
export function requirementKey(view: ComponentPreparation): string {
  return view.case.components
    .map(
      (component) => `${component.component_type_id}:${component.needed_count}`
    )
    .join(",")
}

export function toPrepareUnitsPayload(
  values: PrepareUnitsOutput
): PrepareUnitsInput {
  const preparedAt =
    values.prepared_at === "" ? null : localDateTimeToIso(values.prepared_at)
  return {
    // Validation guarantees the component; a row without one is never sent.
    units: values.units.flatMap((row) =>
      row.component_type_id === undefined
        ? []
        : [
            {
              component_type_id: row.component_type_id,
              ...(row.storage_location_id === undefined
                ? {}
                : { storage_location_id: row.storage_location_id }),
              ...(row.volume_ml === undefined
                ? {}
                : { volume_ml: row.volume_ml }),
              for_case: row.for_case,
            },
          ]
    ),
    ...(preparedAt === null ? {} : { prepared_at: preparedAt }),
  }
}
