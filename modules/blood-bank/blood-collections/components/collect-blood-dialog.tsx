"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { PrinterIcon } from "lucide-react"
import {
  Controller,
  useForm,
  type Control,
  type UseFormSetError,
} from "react-hook-form"
import { toast } from "sonner"

import { DateTimeInput } from "@/components/date-time-input"
import { Form } from "@/components/form"
import { NumberInput } from "@/components/number-input"
import { RequiredMark } from "@/components/required-mark"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { isApiError } from "@/lib/api-error"
import { applyServerErrors } from "@/lib/form-errors"
import { nowLocalDateTime } from "@/lib/format"
import {
  bloodCollectionErrorText,
  bloodCollectionReloadCodes,
} from "@/modules/blood-bank/blood-collections/error-messages"
import { useCollectBlood } from "@/modules/blood-bank/blood-collections/queries"
import {
  collectBloodSchema,
  defaultCollectBloodValues,
  toCollectBloodPayload,
  UNIT_VOLUME_ML,
  type CollectBloodValues,
} from "@/modules/blood-bank/blood-collections/schemas"
import type {
  BagPlanRow,
  BloodCollection,
  CollectionDonor,
} from "@/modules/blood-bank/blood-collections/types"
import { useStorageLocations } from "@/modules/blood-bank/storage-locations/queries"
import type { StorageLocation } from "@/modules/blood-bank/storage-locations/types"

/**
 * "Collect" for one eligible donor: the units the bag is made into (the bag plan: patient
 * units locked, storage units with their shelf, each with an optional volume), notes and
 * when (empty is now; may be back-dated). "Collect and Print" saves the bag and its units and
 * hands the refreshed screen to `onCollected`, whose `collected_units` carry the labels to
 * print (patient label, storage label).
 */
export function CollectBloodDialog({
  caseId,
  donor,
  plan,
  onOpenChange,
  onCollected,
}: {
  caseId: number
  /** The donor to collect from; null keeps the dialog closed. */
  donor: CollectionDonor | null
  plan: BagPlanRow[]
  onOpenChange: (open: boolean) => void
  onCollected: (view: BloodCollection) => void
}) {
  const collect = useCollectBlood(caseId)
  const locations = useStorageLocations()

  return (
    <Dialog
      open={donor !== null}
      onOpenChange={collect.isPending ? undefined : onOpenChange}
    >
      <DialogContent className="sm:max-w-2xl">
        {donor === null ? null : locations.data ? (
          <CollectBloodForm
            // The content unmounts on close, so each opening starts from the defaults.
            key={donor.case_donor_id}
            donor={donor}
            plan={plan}
            locations={locations.data}
            isPending={collect.isPending}
            onCancel={() => onOpenChange(false)}
            onSubmit={(values, setError) => {
              if (collect.isPending || donor.case_donor_id === null) {
                return
              }
              collect.mutate(
                {
                  caseDonorId: donor.case_donor_id,
                  values: toCollectBloodPayload(values),
                },
                {
                  onSuccess: onCollected,
                  onError: (error) => {
                    if (applyServerErrors(error, setError)) {
                      return
                    }
                    toast.error(bloodCollectionErrorText(error))
                    // The screen is being reloaded; the row's Collect state may have changed.
                    if (
                      isApiError(error) &&
                      bloodCollectionReloadCodes.includes(error.code)
                    ) {
                      onOpenChange(false)
                    }
                  },
                }
              )
            }}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Collect blood</DialogTitle>
              <DialogDescription>Loading storage locations…</DialogDescription>
            </DialogHeader>
            <Skeleton className="h-48 w-full" />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CollectBloodForm({
  donor,
  plan,
  locations,
  isPending,
  onCancel,
  onSubmit,
}: {
  donor: CollectionDonor
  plan: BagPlanRow[]
  locations: StorageLocation[]
  isPending: boolean
  onCancel: () => void
  onSubmit: (
    values: CollectBloodValues,
    setError: UseFormSetError<CollectBloodValues>
  ) => void
}) {
  const form = useForm<CollectBloodValues>({
    resolver: zodResolver(collectBloodSchema),
    defaultValues: defaultCollectBloodValues(plan, locations),
  })
  const { control } = form
  // A server error on `units` as a whole (a storage unit left out of the request).
  const unitsError =
    form.formState.errors.units?.root?.message ??
    form.formState.errors.units?.message

  return (
    <Form
      onSubmit={form.handleSubmit((values) => onSubmit(values, form.setError))}
      className="flex flex-col gap-4"
      aria-label="Collect blood"
    >
      <DialogHeader>
        <DialogTitle>Collect blood</DialogTitle>
        <DialogDescription>
          {[donor.number, donor.name].filter(Boolean).join(" · ") || "Donor"}
          {donor.sequence_no === null ? null : ` (donor #${donor.sequence_no})`}
        </DialogDescription>
      </DialogHeader>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">
          Units from this bag
        </legend>
        {plan.map((row, index) => (
          <UnitRow
            key={row.component_type_id}
            row={row}
            index={index}
            control={control}
            locations={locations}
          />
        ))}
        {unitsError ? <FieldError errors={[{ message: unitsError }]} /> : null}
      </fieldset>

      <Controller
        name="notes"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="collect_notes">Notes</FieldLabel>
            <Input
              {...field}
              id="collect_notes"
              maxLength={500}
              autoComplete="nope"
              aria-invalid={fieldState.invalid}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        name="collected_at"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="collect_collected_at">Collected at</FieldLabel>
            <DateTimeInput
              id="collect_collected_at"
              name={field.name}
              ref={field.ref}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              // Picking a date fills the current time, ready to be moved back.
              defaultTime={() => nowLocalDateTime().slice(11)}
              className="sm:max-w-80"
              invalid={fieldState.invalid}
            />
            <FieldDescription>
              Leave empty for now. 24-hour time, Dhaka.
            </FieldDescription>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <PrinterIcon data-icon="inline-start" />
          )}
          Collect and Print
        </Button>
      </DialogFooter>
    </Form>
  )
}

/**
 * One planned unit: the component (locked), where it is stored (only when it needs a shelf)
 * and its ml (optional).
 */
function UnitRow({
  row,
  index,
  control,
  locations,
}: {
  row: BagPlanRow
  index: number
  control: Control<CollectBloodValues>
  locations: StorageLocation[]
}) {
  const id = (name: string) => `collect_units_${index}_${name}`

  return (
    <div className="grid items-start gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_7rem]">
      <Field>
        <FieldLabel htmlFor={id("component")}>
          Component
          <Badge variant={row.for_patient ? "default" : "secondary"}>
            {row.for_patient ? "Patient" : "Storage"}
          </Badge>
        </FieldLabel>
        <Input
          id={id("component")}
          value={`${row.code} · ${row.name}`}
          disabled
          readOnly
        />
      </Field>

      {row.needs_storage_location ? (
        <Controller
          name={`units.${index}.storage_location_id`}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={id("storage_location_id")}>
                Storage location
                <RequiredMark />
              </FieldLabel>
              <Select
                value={field.value === undefined ? "" : String(field.value)}
                onValueChange={(value) => field.onChange(Number(value))}
              >
                <SelectTrigger
                  id={id("storage_location_id")}
                  ref={field.ref}
                  aria-invalid={fieldState.invalid}
                  className="w-full"
                >
                  <SelectValue placeholder="Choose a shelf" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={String(location.id)}>
                      {location.code} · {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      ) : (
        <Field>
          <FieldLabel htmlFor={id("storage_location_id")}>
            Storage location
          </FieldLabel>
          <Input
            id={id("storage_location_id")}
            value="Reserved for the patient"
            disabled
            readOnly
          />
        </Field>
      )}

      <Controller
        name={`units.${index}.volume_ml`}
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id("volume_ml")}>Volume (ml)</FieldLabel>
            <NumberInput
              id={id("volume_ml")}
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
    </div>
  )
}
