"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { CircleCheckIcon } from "lucide-react"
import { useState } from "react"
import {
  Controller,
  useForm,
  type Control,
  type UseFormSetError,
} from "react-hook-form"
import { toast } from "sonner"

import { DateTime } from "@/components/date-time"
import { DateTimeInput } from "@/components/date-time-input"
import { Form } from "@/components/form"
import { NumberInput } from "@/components/number-input"
import { RequiredMark } from "@/components/required-mark"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Spinner } from "@/components/ui/spinner"
import { isApiError } from "@/lib/api-error"
import { applyServerErrors } from "@/lib/form-errors"
import { nowLocalDateTime } from "@/lib/format"
import {
  bloodCollectionErrorText,
  bloodCollectionReloadCodes,
} from "@/modules/blood-bank/blood-collections/error-messages"
import {
  defaultRecordPhlebotomyValues,
  PHLEBOTOMY_VOLUME_ML,
  recordPhlebotomySchema,
  toRecordPhlebotomyPayload,
  type RecordPhlebotomyValues,
} from "@/modules/blood-bank/blood-collections/phlebotomy-schemas"
import { useRecordPhlebotomy } from "@/modules/blood-bank/blood-collections/queries"
import type {
  BloodCollection,
  PhlebotomyVitals,
} from "@/modules/blood-bank/blood-collections/types"
import { VITALS } from "@/modules/blood-bank/blood-issue/schemas"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { useCan } from "@/modules/shared/rbac/use-can"

/**
 * Blood Collection for a Therapeutic Phlebotomy case: no donors and no sample. "Mark done"
 * records the blood drawn from the patient (with optional pre/post vitals) and closes the
 * case; afterwards the panel shows what was recorded.
 */
export function PhlebotomyPanel({
  view,
  onRecorded,
}: {
  view: BloodCollection
  onRecorded: () => void
}) {
  const canRecord = useCan(BloodBankPermission.PhlebotomyRecord)
  const [open, setOpen] = useState(false)
  const record = useRecordPhlebotomy(view.case.id)
  const { phlebotomy } = view

  return (
    <Card size="sm">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Therapeutic Phlebotomy</CardTitle>
        {canRecord && view.can_record_phlebotomy ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <CircleCheckIcon data-icon="inline-start" />
            Mark done
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {phlebotomy ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 xl:grid-cols-5">
            <Info label="Volume drawn" value={`${phlebotomy.volume_ml} ml`} />
            <Info label="Pre vitals" value={vitalsText(phlebotomy.pre)} />
            <Info label="Post vitals" value={vitalsText(phlebotomy.post)} />
            <Info
              label="Done"
              value={
                <>
                  <DateTime value={phlebotomy.performed_at} /> by{" "}
                  {phlebotomy.performed_by.name}
                </>
              }
            />
            <Info label="Notes" value={phlebotomy.notes} />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            {view.can_record_phlebotomy
              ? "No donor or sample is needed. Draw the blood from the patient, then mark it done; this closes the case."
              : "Not recorded. The case is no longer open."}
          </p>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={record.isPending ? undefined : setOpen}>
        <DialogContent className="sm:max-w-2xl">
          {open ? (
            <RecordPhlebotomyForm
              isPending={record.isPending}
              onCancel={() => setOpen(false)}
              onSubmit={(values, setError) => {
                if (record.isPending) {
                  return
                }
                record.mutate(toRecordPhlebotomyPayload(values), {
                  onSuccess: () => {
                    setOpen(false)
                    toast.success(
                      `Therapeutic phlebotomy recorded; case ${view.case.case_no} closed.`
                    )
                    onRecorded()
                  },
                  onError: (error) => {
                    if (applyServerErrors(error, setError)) {
                      return
                    }
                    toast.error(bloodCollectionErrorText(error))
                    if (
                      isApiError(error) &&
                      bloodCollectionReloadCodes.includes(error.code)
                    ) {
                      setOpen(false)
                    }
                  },
                })
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function vitalsText(vitals: PhlebotomyVitals | null): string | null {
  if (!vitals) {
    return null
  }
  return `P ${vitals.pulse_bpm} · BP ${vitals.bp_systolic}/${vitals.bp_diastolic} · ${vitals.temperature_f}°F`
}

function RecordPhlebotomyForm({
  isPending,
  onCancel,
  onSubmit,
}: {
  isPending: boolean
  onCancel: () => void
  onSubmit: (
    values: RecordPhlebotomyValues,
    setError: UseFormSetError<RecordPhlebotomyValues>
  ) => void
}) {
  const form = useForm<RecordPhlebotomyValues>({
    resolver: zodResolver(recordPhlebotomySchema),
    defaultValues: defaultRecordPhlebotomyValues,
  })
  const { control } = form

  return (
    <Form
      onSubmit={form.handleSubmit((values) => onSubmit(values, form.setError))}
      className="flex flex-col gap-4"
      aria-label="Therapeutic phlebotomy"
    >
      <DialogHeader>
        <DialogTitle>Therapeutic Phlebotomy – Mark done</DialogTitle>
        <DialogDescription>
          Records the blood drawn and closes the case. Vitals are optional; a
          set once started needs all four values.
        </DialogDescription>
      </DialogHeader>

      <Controller
        name="volume_ml"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="phlebotomy_volume_ml">
              Volume drawn (ml)
              <RequiredMark />
            </FieldLabel>
            <NumberInput
              id="phlebotomy_volume_ml"
              name={field.name}
              ref={field.ref}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              max={PHLEBOTOMY_VOLUME_ML.max}
              autoFocus
              className="sm:max-w-32"
              aria-invalid={fieldState.invalid}
            />
            <FieldDescription>
              {PHLEBOTOMY_VOLUME_ML.min}–{PHLEBOTOMY_VOLUME_ML.max} ml.
            </FieldDescription>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <VitalsFields set="pre" legend="Before" control={control} />
      <VitalsFields set="post" legend="After" control={control} />

      <Controller
        name="notes"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="phlebotomy_notes">Notes</FieldLabel>
            <Input
              {...field}
              id="phlebotomy_notes"
              maxLength={500}
              aria-invalid={fieldState.invalid}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        name="performed_at"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="phlebotomy_performed_at">Done at</FieldLabel>
            <DateTimeInput
              id="phlebotomy_performed_at"
              name={field.name}
              ref={field.ref}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
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
            <CircleCheckIcon data-icon="inline-start" />
          )}
          Mark done
        </Button>
      </DialogFooter>
    </Form>
  )
}

function VitalsFields({
  set,
  legend,
  control,
}: {
  set: "pre" | "post"
  legend: string
  control: Control<RecordPhlebotomyValues>
}) {
  const id = (name: string) => `phlebotomy_${set}_${name}`
  const numbers = [
    { name: "pulse_bpm", label: "Pulse (bpm)" },
    { name: "bp_systolic", label: "BP systolic" },
    { name: "bp_diastolic", label: "BP diastolic" },
  ] as const

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{legend} (optional)</legend>
      <div className="grid gap-3 sm:grid-cols-4">
        {numbers.map(({ name, label }) => (
          <Controller
            key={name}
            name={`${set}.${name}`}
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={id(name)}>{label}</FieldLabel>
                <NumberInput
                  id={id(name)}
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  max={VITALS[name].max}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        ))}
        <Controller
          name={`${set}.temperature_f`}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={id("temperature_f")}>Temp (°F)</FieldLabel>
              <Input
                {...field}
                id={id("temperature_f")}
                inputMode="decimal"
                maxLength={5}
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>
    </fieldset>
  )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value ?? "—"}</dd>
    </div>
  )
}
