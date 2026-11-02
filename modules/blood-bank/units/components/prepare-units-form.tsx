"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { FlaskConicalIcon, LockIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useMemo } from "react"
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
} from "react-hook-form"
import { toast } from "sonner"

import { ChoiceGroup } from "@/components/choice-group"
import { DateTimeInput } from "@/components/date-time-input"
import { Form } from "@/components/form"
import { NumberInput } from "@/components/number-input"
import { ReadonlyInput } from "@/components/readonly-input"
import { RequiredMark } from "@/components/required-mark"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { applyServerErrors } from "@/lib/form-errors"
import { nowLocalDateTime } from "@/lib/format"
import type { ComponentType } from "@/modules/blood-bank/component-types/types"
import type { StorageLocation } from "@/modules/blood-bank/storage-locations/types"
import { unitErrorText } from "@/modules/blood-bank/units/error-messages"
import { usePrepareUnits } from "@/modules/blood-bank/units/queries"
import {
  canShowReserve,
  canToggleReserve,
  defaultPrepareValues,
  emptyUnitRow,
  MAX_UNITS,
  PreparationMode,
  preparationModeLabels,
  preparationRequirement,
  prepareUnitsSchema,
  RequirementKind,
  rowsForMode,
  toPrepareUnitsPayload,
  UNIT_VOLUME_ML,
  type PreparationRequirement,
  type PrepareUnitsOutput,
  type PrepareUnitsValues,
} from "@/modules/blood-bank/units/schemas"
import type {
  ComponentPreparation,
  PreparationComponent,
} from "@/modules/blood-bank/units/types"

/** One line under the mode choice saying what the case's billing dictates. */
function requirementHint(requirement: PreparationRequirement): string {
  const codes = requirement.neededComponents
    .map((component) => component.code)
    .join(", ")
  switch (requirement.kind) {
    case RequirementKind.WholeBlood:
      return "The case needs whole blood: the bag is kept as whole blood for the patient."
    case RequirementKind.Components:
      return `The case needs ${codes}: the bag is separated, with a unit of each for the patient. Add more rows for stock.`
    case RequirementKind.Either:
      return `The case needs whole blood or ${codes}: choose how to prepare the bag.`
    case RequirementKind.None:
      return "The case needs nothing more: every unit goes to stock."
  }
}

/**
 * Turns the bag into units: whole blood (one row) or 1–6 separated components, each with a
 * storage location (optional for the patient's units), an optional volume and "For this
 * patient". The mode and the patient rows follow what the case was billed for and still needs
 * (see `preparationRequirement`). `onPrepared` gets the refreshed screen, whose
 * `prepared_unit_ids` are the new units.
 */
export function PrepareUnitsForm({
  view,
  wholeBlood,
  componentTypes,
  storageLocations,
  onPrepared,
}: {
  view: ComponentPreparation
  /** The whole-blood component type; undefined means the bag can only be separated. */
  wholeBlood: ComponentType | undefined
  /** Component types a bag can be separated into (whole blood excluded). */
  componentTypes: ComponentType[]
  storageLocations: StorageLocation[]
  onPrepared: (view: ComponentPreparation) => void
}) {
  const prepare = usePrepareUnits({ caseId: view.case.id, bagId: view.bag.id })
  const { components } = view.case
  const requirement = useMemo(
    () => preparationRequirement(components, wholeBlood),
    [components, wholeBlood]
  )
  const schema = useMemo(
    () =>
      prepareUnitsSchema({
        components,
        collectedAt: view.bag.collected_at,
        wholeBloodId: wholeBlood?.id,
      }),
    [components, view.bag.collected_at, wholeBlood?.id]
  )
  const form = useForm<PrepareUnitsValues, unknown, PrepareUnitsOutput>({
    resolver: zodResolver(schema),
    defaultValues: defaultPrepareValues(requirement, wholeBlood),
  })
  const { control, formState } = form
  const units = useFieldArray({ control, name: "units" })
  const mode = useWatch({ control, name: "mode" })
  const isWholeBlood = mode === PreparationMode.WholeBlood
  const unitsError =
    formState.errors.units?.message ?? formState.errors.units?.root?.message
  const modeOptions = Object.values(PreparationMode).map((value) => ({
    value,
    label: preparationModeLabels[value],
    disabled:
      !requirement.modes.includes(value) ||
      (value === PreparationMode.WholeBlood && !wholeBlood),
  }))

  function changeMode(next: PreparationMode) {
    if (next === mode) {
      return
    }
    form.setValue("mode", next)
    form.clearErrors("units")
    units.replace(rowsForMode(next, requirement, wholeBlood))
  }

  function onSubmit(values: PrepareUnitsOutput) {
    if (prepare.isPending) {
      return
    }
    prepare.mutate(toPrepareUnitsPayload(values), {
      onSuccess: onPrepared,
      onError: (error) => {
        if (!applyServerErrors(error, form.setError)) {
          toast.error(unitErrorText(error))
        }
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prepare</CardTitle>
      </CardHeader>
      <CardContent>
        <Form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          aria-label="Prepare units"
        >
          <div className="flex flex-col gap-2">
            <span id="prepare_mode_label" className="sr-only">
              Preparation
            </span>
            <ChoiceGroup
              id="prepare_mode"
              value={mode}
              onChange={changeMode}
              options={modeOptions}
              aria-labelledby="prepare_mode_label"
            />
            <p className="text-sm text-muted-foreground">
              {requirementHint(requirement)}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {units.fields.map((row, index) => (
              <UnitRow
                key={row.id}
                index={index}
                control={control}
                isWholeBlood={isWholeBlood}
                wholeBlood={wholeBlood}
                componentTypes={componentTypes}
                storageLocations={storageLocations}
                components={components}
                // An added row is for stock until staff switch it on.
                onComponentChange={() =>
                  form.setValue(`units.${index}.for_case`, false)
                }
                onRemove={
                  !isWholeBlood && units.fields.length > 1 && !row.locked
                    ? () => units.remove(index)
                    : undefined
                }
              />
            ))}
            {unitsError ? <FieldError>{unitsError}</FieldError> : null}
            {!isWholeBlood ? (
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={units.fields.length >= MAX_UNITS}
                  onClick={() => units.append(emptyUnitRow())}
                >
                  <PlusIcon data-icon="inline-start" />
                  Add component
                </Button>
              </div>
            ) : null}
          </div>

          <Controller
            name="prepared_at"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="sm:max-w-80">
                <FieldLabel htmlFor="prepare_prepared_at">
                  Prepared at
                </FieldLabel>
                <DateTimeInput
                  id="prepare_prepared_at"
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  defaultTime={() => nowLocalDateTime().slice(11)}
                  invalid={fieldState.invalid}
                />
                <FieldDescription>
                  Leave empty for now. 24-hour time.
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={prepare.isPending}>
              {prepare.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <FlaskConicalIcon data-icon="inline-start" />
              )}
              Prepare
            </Button>
          </div>
        </Form>
      </CardContent>
    </Card>
  )
}

function UnitRow({
  index,
  control,
  isWholeBlood,
  wholeBlood,
  componentTypes,
  storageLocations,
  components,
  onComponentChange,
  onRemove,
}: {
  index: number
  control: Control<PrepareUnitsValues, unknown, PrepareUnitsOutput>
  isWholeBlood: boolean
  wholeBlood: ComponentType | undefined
  componentTypes: ComponentType[]
  storageLocations: StorageLocation[]
  components: readonly PreparationComponent[]
  onComponentChange: () => void
  onRemove: (() => void) | undefined
}) {
  const rows = useWatch({ control, name: "units" })
  const row = rows[index]
  const locked = row?.locked ?? false
  const forCase = row?.for_case ?? false
  const showReserve = canShowReserve(components, row?.component_type_id)
  const id = (name: string) => `prepare_units_${index}_${name}`
  // A locked row's component is one the case was billed for.
  const lockedComponent = components.find(
    (component) => component.component_type_id === row?.component_type_id
  )

  return (
    <div className="grid items-start gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_7rem_10rem_auto]">
      {isWholeBlood || locked ? (
        <Field>
          <FieldLabel htmlFor={id("component")}>Component</FieldLabel>
          <ReadonlyInput
            id={id("component")}
            value={
              isWholeBlood
                ? wholeBlood && `${wholeBlood.code} – ${wholeBlood.name}`
                : lockedComponent &&
                  `${lockedComponent.code} – ${lockedComponent.name}`
            }
          />
        </Field>
      ) : (
        <Controller
          name={`units.${index}.component_type_id`}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={id("component")}>
                Component
                <RequiredMark />
              </FieldLabel>
              <Select
                value={field.value === undefined ? "" : String(field.value)}
                onValueChange={(value) => {
                  field.onChange(Number(value))
                  onComponentChange()
                }}
              >
                <SelectTrigger
                  id={id("component")}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  aria-invalid={fieldState.invalid}
                  className="w-full"
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {componentTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.code} – {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      )}

      <Controller
        name={`units.${index}.storage_location_id`}
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id("storage")}>
              Storage location
              {forCase ? (
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              ) : (
                <RequiredMark />
              )}
            </FieldLabel>
            <Select
              value={field.value === undefined ? "" : String(field.value)}
              onValueChange={(value) => field.onChange(Number(value))}
            >
              <SelectTrigger
                id={id("storage")}
                ref={field.ref}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
                className="w-full"
              >
                <SelectValue
                  placeholder={forCase ? "With patient's case" : "Select"}
                />
              </SelectTrigger>
              <SelectContent>
                {storageLocations.map((location) => (
                  <SelectItem key={location.id} value={String(location.id)}>
                    {location.code} – {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {forCase && field.value !== undefined ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto self-start p-0"
                onClick={() => field.onChange(undefined)}
              >
                Clear location
              </Button>
            ) : null}
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        name={`units.${index}.volume_ml`}
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id("volume")}>Volume (ml)</FieldLabel>
            <NumberInput
              id={id("volume")}
              name={field.name}
              ref={field.ref}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              max={UNIT_VOLUME_ML.max}
              aria-invalid={fieldState.invalid}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        name={`units.${index}.for_case`}
        control={control}
        render={({ field, fieldState }) =>
          showReserve ? (
            <Field data-invalid={fieldState.invalid} className="sm:pt-6">
              <div className="flex items-center gap-2">
                <Switch
                  id={id("for_case")}
                  ref={field.ref}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={!canToggleReserve(components, rows, index)}
                  aria-invalid={fieldState.invalid}
                />
                <FieldLabel
                  htmlFor={id("for_case")}
                  className="font-normal whitespace-nowrap"
                >
                  For this patient
                  {locked ? (
                    <LockIcon
                      className="size-3.5 text-muted-foreground"
                      aria-label="Required by the case"
                    />
                  ) : null}
                </FieldLabel>
              </div>
              <FieldError errors={[fieldState.error]} />
            </Field>
          ) : (
            <p className="text-sm text-muted-foreground sm:pt-8">Stock</p>
          )
        }
      />

      <div className="sm:pt-6">
        {onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            aria-label={`Remove row ${index + 1}`}
          >
            <Trash2Icon />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
