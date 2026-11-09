"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { HandHeartIcon, TriangleAlertIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { Controller, useForm, useWatch, type Control } from "react-hook-form"
import { toast } from "sonner"

import { ChoiceGroup, type ChoiceOption } from "@/components/choice-group"
import { DateTime } from "@/components/date-time"
import { EnumSelect } from "@/components/enum-select"
import { Form } from "@/components/form"
import { NumberInput } from "@/components/number-input"
import { RequiredMark } from "@/components/required-mark"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { hasErrorCode, isApiError } from "@/lib/api-error"
import { applyServerErrors } from "@/lib/form-errors"
import {
  BloodIssueErrorCode,
  bloodIssueErrorMessages,
  bloodIssueErrorText,
  isBloodIssueReloadError,
} from "@/modules/blood-bank/blood-issue/error-messages"
import { donorTitle, vitalsText } from "@/modules/blood-bank/blood-issue/format"
import { useIssueBlood } from "@/modules/blood-bank/blood-issue/queries"
import {
  AMENDMENT_REASON_MAX,
  amendmentRequired,
  bloodGroupChanged,
  donorsWithRecordedVitals,
  isIncompatible,
  issueBloodDefaults,
  issueBloodSchema,
  REMARKS_MAX,
  toIssueBloodPayload,
  unitDonor,
  VITALS,
  type IssueBloodContext,
  type IssueBloodOutput,
  type IssueBloodValues,
} from "@/modules/blood-bank/blood-issue/schemas"
import type {
  BloodIssue,
  IssueDonor,
  IssueUnit,
  PdfFile,
} from "@/modules/blood-bank/blood-issue/types"
import {
  CrossmatchResult,
  crossmatchResultLabels,
} from "@/modules/blood-bank/enums"
import { bloodGroupLabels } from "@/modules/shared/patient/enums"
import { StaffCombobox } from "@/modules/shared/staff/components/staff-combobox"

const crossmatchOptions: readonly ChoiceOption<CrossmatchResult>[] = [
  {
    value: CrossmatchResult.Compatible,
    label: crossmatchResultLabels.compatible,
    tone: "success",
  },
  {
    value: CrossmatchResult.Incompatible,
    label: crossmatchResultLabels.incompatible,
    tone: "destructive",
  },
]

/** Server error keys that sit under a visible field; any other one is toasted. */
const visibleErrorKey =
  /^(patient_blood_group|amendment_reason|technologist_id|physician_id|units\.\d+\.(major_result|minor_result|remarks)|post_donation\.\d+\.(pulse_bpm|bp_systolic|bp_diastolic|temperature_f))$/

/**
 * "Issue Blood" for the selected units: one form, one request. The patient blood group
 * (required until recorded; a change needs an amendment reason), the Medical Technologist and
 * Physician who sign the report, each unit's major and minor crossmatch, and (optionally) the
 * post-donation vitals of donors without recorded ones; recorded vitals are shown read-only.
 * `onIssued` gets the report PDF (201).
 */
export function IssueBloodDialog({
  view,
  units,
  open,
  onOpenChange,
  onIssued,
}: {
  view: BloodIssue
  /** The units to issue (the ticked rows). */
  units: IssueUnit[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onIssued: (pdf: PdfFile) => void
}) {
  const issue = useIssueBlood(view.case.id)

  return (
    <Dialog
      open={open}
      onOpenChange={issue.isPending ? undefined : onOpenChange}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-4xl">
        {open ? (
          <IssueBloodForm
            view={view}
            units={units}
            isPending={issue.isPending}
            onCancel={() => onOpenChange(false)}
            onSubmit={(payload, handlers) => {
              if (issue.isPending) {
                return
              }
              issue.mutate(payload, {
                onSuccess: onIssued,
                onError: (error) => {
                  if (handlers.onError(error)) {
                    return
                  }
                  toast.error(bloodIssueErrorText(error))
                  // The screen is being reloaded; the selection may no longer hold.
                  if (isBloodIssueReloadError(error)) {
                    onOpenChange(false)
                  }
                },
              })
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function IssueBloodForm({
  view,
  units,
  isPending,
  onCancel,
  onSubmit,
}: {
  view: BloodIssue
  units: IssueUnit[]
  isPending: boolean
  onCancel: () => void
  onSubmit: (
    payload: NonNullable<ReturnType<typeof toIssueBloodPayload>>,
    handlers: { onError: (error: unknown) => boolean }
  ) => void
}) {
  const recordedGroup = view.patient_sample?.blood_group ?? null
  // Set when the server asks for an amendment reason this form did not expect.
  const [forceAmendment, setForceAmendment] = useState(false)
  const context = useMemo<IssueBloodContext>(
    () => ({
      recordedBloodGroup: recordedGroup?.value ?? null,
      crossmatchedUnitIds: units
        .filter((unit) => unit.crossmatch !== null)
        .map((unit) => unit.id),
      forceAmendment,
    }),
    [recordedGroup?.value, units, forceAmendment]
  )
  const schema = useMemo(() => issueBloodSchema(context), [context])
  const form = useForm<IssueBloodValues, unknown, IssueBloodOutput>({
    resolver: zodResolver(schema),
    defaultValues: issueBloodDefaults(view, units),
  })
  const { control } = form
  const bloodGroup = useWatch({ control, name: "patient_blood_group" })
  const unitRows = useWatch({ control, name: "units" })
  const vitalsRows = useWatch({ control, name: "post_donation" })
  const showAmendment = amendmentRequired(
    { patient_blood_group: bloodGroup, units: unitRows },
    context
  )
  const incompatibleUnits = units.filter((unit, index) => {
    const row = unitRows[index]
    return row !== undefined && isIncompatible(row)
  })
  const recordedDonors = donorsWithRecordedVitals(view.donors, units)

  function handleError(error: unknown): boolean {
    if (hasErrorCode(error, BloodIssueErrorCode.AmendmentReasonRequired)) {
      setForceAmendment(true)
      form.setError(
        "amendment_reason",
        {
          type: "server",
          message:
            bloodIssueErrorMessages[
              BloodIssueErrorCode.AmendmentReasonRequired
            ],
        },
        { shouldFocus: true }
      )
      return true
    }
    if (!applyServerErrors(error, form.setError)) {
      return false
    }
    // A message for a key with no field of its own (e.g. a unit id) would be lost.
    const hidden =
      isApiError(error) &&
      Object.entries(error.errors).find(([key]) => !visibleErrorKey.test(key))
    if (hidden) {
      toast.error(hidden[1][0] ?? bloodIssueErrorText(error))
    }
    return true
  }

  return (
    <Form
      onSubmit={form.handleSubmit((values) => {
        const payload = toIssueBloodPayload(values, context)
        if (payload) {
          onSubmit(payload, { onError: handleError })
        }
      })}
      className="flex flex-col gap-6"
      aria-label="Issue blood"
    >
      <DialogHeader>
        <DialogTitle>Issue blood</DialogTitle>
        <DialogDescription>
          Case {view.case.case_no}
          {view.patient ? ` · ${view.patient.name}` : null} ·{" "}
          {units.length === 1 ? "1 unit" : `${units.length} units`}. Saves the
          crossmatch, issues the units and prints the Compatibility Test Report.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <Controller
          name="patient_blood_group"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="issue_patient_blood_group">
                Patient blood group
                {recordedGroup ? null : <RequiredMark />}
              </FieldLabel>
              <EnumSelect
                id="issue_patient_blood_group"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                labels={bloodGroupLabels}
                invalid={fieldState.invalid}
              />
              <FieldDescription>
                {recordedGroup ? (
                  <>
                    Recorded {bloodGroupLabels[recordedGroup.value]}
                    {recordedGroup.tested_by
                      ? ` by ${recordedGroup.tested_by.name}`
                      : null}
                    , <DateTime value={recordedGroup.tested_at} />.
                    {bloodGroupChanged(field.value, recordedGroup.value)
                      ? " Changing it needs a reason."
                      : null}
                  </>
                ) : (
                  "Not entered yet on the patient sample."
                )}
              </FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {showAmendment ? (
          <Controller
            name="amendment_reason"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="issue_amendment_reason">
                  Amendment reason
                  <RequiredMark />
                </FieldLabel>
                <Textarea
                  {...field}
                  id="issue_amendment_reason"
                  rows={2}
                  maxLength={AMENDMENT_REASON_MAX}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        ) : (
          <div className="hidden md:block" />
        )}

        <Controller
          name="technologist_id"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="issue_technologist_id">
                Medical technologist
                <RequiredMark />
              </FieldLabel>
              <StaffCombobox
                id="issue_technologist_id"
                inputRef={field.ref}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={fieldState.invalid}
                nameLabel="Medical technologist name"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="physician_id"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="issue_physician_id">
                Physician
                <RequiredMark />
              </FieldLabel>
              <StaffCombobox
                id="issue_physician_id"
                inputRef={field.ref}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={fieldState.invalid}
                nameLabel="Physician name"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="issue_units">
        <h3 id="issue_units" className="text-sm font-medium">
          Crossmatch
        </h3>
        {units.map((unit, index) => (
          <UnitCrossmatchRow
            key={unit.id}
            index={index}
            unit={unit}
            donor={unitDonor(view.donors, unit)}
            control={control}
          />
        ))}
        {incompatibleUnits.length > 0 ? (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>Incompatible blood cannot be issued</AlertTitle>
            <AlertDescription>
              {incompatibleUnits.map((unit) => unit.unit_no).join(", ")}{" "}
              {incompatibleUnits.length === 1 ? "is" : "are"} marked
              incompatible. Nothing is saved while a unit is incompatible: close
              this form and untick{" "}
              {incompatibleUnits.length === 1 ? "it" : "them"} to issue the
              others.
            </AlertDescription>
          </Alert>
        ) : null}
      </section>

      {vitalsRows.length > 0 || recordedDonors.length > 0 ? (
        <section className="flex flex-col gap-3" aria-labelledby="issue_vitals">
          <h3 id="issue_vitals" className="text-sm font-medium">
            Post-donation vitals{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </h3>
          {vitalsRows.map((row, index) => {
            const donor = view.donors.find(
              (candidate) => candidate.case_donor_id === row.case_donor_id
            )
            return (
              <VitalsBlock
                key={row.case_donor_id}
                index={index}
                donor={donor}
                control={control}
              />
            )
          })}
          {recordedDonors.map((donor) =>
            donor.examination?.post ? (
              <div
                key={donor.case_donor_id ?? donor.number}
                className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3 text-sm"
              >
                <span className="font-medium">{donorTitle(donor)}</span>
                <span>{vitalsText(donor.examination.post)}</span>
                <span className="text-xs text-muted-foreground">
                  Recorded{" "}
                  <DateTime value={donor.examination.post.recorded_at} />
                  {donor.examination.post.recorded_by
                    ? ` by ${donor.examination.post.recorded_by.name}`
                    : null}
                </span>
              </div>
            ) : null
          )}
        </section>
      ) : null}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || incompatibleUnits.length > 0}
        >
          {isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <HandHeartIcon data-icon="inline-start" />
          )}
          Issue blood
        </Button>
      </DialogFooter>
    </Form>
  )
}

function UnitCrossmatchRow({
  index,
  unit,
  donor,
  control,
}: {
  index: number
  unit: IssueUnit
  donor: IssueDonor | undefined
  control: Control<IssueBloodValues, unknown, IssueBloodOutput>
}) {
  const id = (name: string) => `issue_units_${index}_${name}`

  return (
    <div className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(10rem,14rem)_1fr_1fr]">
      <div className="flex min-w-0 flex-col gap-0.5 text-sm">
        <span className="font-medium">{unit.unit_no}</span>
        <span>
          {unit.component.code} · {unit.component.name}
          {unit.blood_group ? ` · ${bloodGroupLabels[unit.blood_group]}` : null}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {donor ? donorTitle(donor) : `Donor ${unit.donor_no}`}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
        {(["major_result", "minor_result"] as const).map((name) => (
          <Controller
            key={name}
            name={`units.${index}.${name}`}
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel id={id(`${name}_label`)} htmlFor={id(name)}>
                  {name === "major_result" ? "Major" : "Minor"}
                  <RequiredMark />
                </FieldLabel>
                <ChoiceGroup
                  id={id(name)}
                  ref={field.ref}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={crossmatchOptions}
                  invalid={fieldState.invalid}
                  aria-labelledby={id(`${name}_label`)}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        ))}
        <Controller
          name={`units.${index}.remarks`}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
              <FieldLabel htmlFor={id("remarks")}>Remarks</FieldLabel>
              <Input
                {...field}
                id={id("remarks")}
                maxLength={REMARKS_MAX}
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>
    </div>
  )
}

function VitalsBlock({
  index,
  donor,
  control,
}: {
  index: number
  donor: IssueDonor | undefined
  control: Control<IssueBloodValues, unknown, IssueBloodOutput>
}) {
  const id = (name: string) => `issue_post_donation_${index}_${name}`
  const numbers = [
    { name: "pulse_bpm", label: "Pulse (bpm)" },
    { name: "bp_systolic", label: "BP systolic" },
    { name: "bp_diastolic", label: "BP diastolic" },
  ] as const

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border p-3">
      <legend className="sr-only">
        Post-donation vitals, {donor ? donorTitle(donor) : "donor"}
      </legend>
      <p className="text-sm font-medium" aria-hidden>
        {donor ? donorTitle(donor) : "Donor"}
        {donor?.bag ? (
          <span className="font-normal text-muted-foreground">
            {" "}
            · bag {donor.bag.bag_no}
          </span>
        ) : null}
      </p>
      <div className="grid gap-3 sm:grid-cols-4">
        {numbers.map(({ name, label }) => (
          <Controller
            key={name}
            name={`post_donation.${index}.${name}`}
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
          name={`post_donation.${index}.temperature_f`}
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={id("temperature_f")}>Temp (°F)</FieldLabel>
              <Input
                {...field}
                id={id("temperature_f")}
                inputMode="decimal"
                autoComplete="off"
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
