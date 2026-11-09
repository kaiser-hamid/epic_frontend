"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { EraserIcon, LockIcon, SaveIcon } from "lucide-react"
import { useState } from "react"
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type FieldPathByValue,
} from "react-hook-form"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { DateTime } from "@/components/date-time"
import { Form } from "@/components/form"
import { RequiredMark } from "@/components/required-mark"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ExaminationStatusBadge } from "@/modules/blood-bank/donor-examinations/components/examination-status-badge"
import { examinationErrorText } from "@/modules/blood-bank/donor-examinations/error-messages"
import {
  LOW_HEMOGLOBIN_G_DL,
  parseDecimal,
} from "@/modules/blood-bank/donor-examinations/format"
import { useRecordPhysicalExamination } from "@/modules/blood-bank/donor-examinations/queries"
import {
  applyExaminationErrors,
  emptyExaminationValues,
  examinationDefaults,
  examinationSchema,
  toExaminationPayload,
  type ExaminationFormValues,
} from "@/modules/blood-bank/donor-examinations/schemas"
import type { ExaminationDonor } from "@/modules/blood-bank/donor-examinations/types"
import { CaseDonorStatus } from "@/modules/blood-bank/enums"
import { bloodGroupLabels, genderLabels } from "@/modules/shared/patient/enums"
import { formatAge } from "@/modules/shared/patient/format"

type TextFieldName = FieldPathByValue<ExaminationFormValues, string>

/**
 * Changes whenever the saved row does, so right after a save the card restarts from the
 * server's values and shows them read-only, while unsaved input on the other donors is kept.
 */
export function donorCardKey(donor: ExaminationDonor): string {
  return [
    donor.case_donor_id,
    donor.case_donor_status,
    donor.examination?.examined_at,
    donor.assessed_at,
    donor.can_examine,
  ].join("|")
}

/** One donor's physical examination form with the physician's "Accept donor" switch. */
export function DonorExaminationCard({
  caseId,
  donor,
  canRecord,
}: {
  caseId: number
  donor: ExaminationDonor
  canRecord: boolean
}) {
  const record = useRecordPhysicalExamination(caseId)
  const [confirming, setConfirming] = useState<ExaminationFormValues | null>(
    null
  )
  const form = useForm<ExaminationFormValues>({
    resolver: zodResolver(examinationSchema),
    defaultValues: examinationDefaults(donor),
  })
  const { control } = form
  // A saved examination (or a locked donor) is shown filled and disabled, with no actions.
  const readOnly =
    !canRecord || !donor.can_examine || donor.examination !== null
  const accept = useWatch({ control, name: "accept" })
  const hemoglobin = useWatch({ control, name: "hemoglobin_g_dl" })
  const hemoglobinValue = parseDecimal(hemoglobin, 1)
  const lowHemoglobin =
    hemoglobinValue !== null && hemoglobinValue < LOW_HEMOGLOBIN_G_DL
  const id = (name: string) => `${name}_${donor.case_donor_id}`

  function save(values: ExaminationFormValues) {
    const payload = toExaminationPayload(values)
    if (record.isPending || payload === null || donor.case_donor_id === null) {
      return
    }
    record.mutate(
      { caseId, caseDonorId: donor.case_donor_id, values: payload },
      {
        onSuccess: () => {
          setConfirming(null)
          toast.success(values.accept ? "Donor accepted." : "Donor deferred.")
        },
        onError: (error) => {
          setConfirming(null)
          if (!applyExaminationErrors(error, form.setError)) {
            toast.error(examinationErrorText(error))
          }
        },
      }
    )
  }

  const submit = form.handleSubmit((values) => {
    // Deferring takes the donor out of this case, so it is confirmed first.
    if (values.accept) {
      save(values)
    } else {
      setConfirming(values)
    }
  })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span>
            Donor {donor.sequence_no ?? "—"}: {donor.name ?? "—"}
            {donor.number ? ` (${donor.number})` : ""}
          </span>
          {donor.case_donor_status ? (
            <ExaminationStatusBadge status={donor.case_donor_status} />
          ) : null}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {[
            formatAge(donor.age),
            donor.gender ? genderLabels[donor.gender] : null,
            donor.blood_group ? bloodGroupLabels[donor.blood_group] : null,
            donor.phone,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {donor.case_donor_status === CaseDonorStatus.Deferred &&
        donor.deferral_reason ? (
          <p className="text-sm text-destructive">
            Deferred: {donor.deferral_reason}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!donor.can_examine ? (
          <Alert>
            <LockIcon />
            <AlertDescription>
              Examination locked: donor sample already collected.
            </AlertDescription>
          </Alert>
        ) : null}

        <Form
          onSubmit={submit}
          className="flex flex-col gap-4"
          aria-label={`Examination of donor ${donor.sequence_no ?? ""}`}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MeasurementField
              control={control}
              name="weight_kg"
              id={id("weight_kg")}
              label="Weight"
              unit="kg"
              inputMode="decimal"
              disabled={readOnly}
              required
            />
            <MeasurementField
              control={control}
              name="height_cm"
              id={id("height_cm")}
              label="Height"
              unit="cm"
              inputMode="decimal"
              disabled={readOnly}
            />
            <MeasurementField
              control={control}
              name="hemoglobin_g_dl"
              id={id("hemoglobin_g_dl")}
              label="Hemoglobin"
              unit="g/dL"
              inputMode="decimal"
              hint={
                lowHemoglobin
                  ? `Below the usual ${LOW_HEMOGLOBIN_G_DL} g/dL.`
                  : undefined
              }
              disabled={readOnly}
              required
            />
          </div>

          <FieldSet className="rounded-lg border p-3">
            <FieldLegend variant="label" className="px-1">
              Pre-donation
            </FieldLegend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MeasurementField
                control={control}
                name="pulse_bpm"
                id={id("pulse_bpm")}
                label="Pulse"
                unit="b/min"
                inputMode="numeric"
                disabled={readOnly}
                required
              />
              <MeasurementField
                control={control}
                name="blood_pressure"
                id={id("blood_pressure")}
                label="BP"
                unit="mmHg"
                placeholder="120/80"
                inputMode="text"
                disabled={readOnly}
                required
              />
              <MeasurementField
                control={control}
                name="temperature_f"
                id={id("temperature_f")}
                label="Temperature"
                unit="°F"
                inputMode="decimal"
                disabled={readOnly}
                required
              />
            </div>
          </FieldSet>

          <Controller
            name="accept"
            control={control}
            render={({ field, fieldState }) => (
              <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                <Switch
                  id={id("accept")}
                  ref={field.ref}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={readOnly}
                  aria-invalid={fieldState.invalid}
                  className="data-checked:bg-green-600 dark:data-checked:bg-green-500"
                />
                <FieldLabel htmlFor={id("accept")} className="font-normal">
                  Accept donor
                </FieldLabel>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          {!accept ? (
            <Controller
              name="deferral_reason"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={id("reason")}>
                    Reason for deferral
                    <RequiredMark />
                  </FieldLabel>
                  <Textarea
                    id={id("reason")}
                    name={field.name}
                    ref={field.ref}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    maxLength={1000}
                    rows={3}
                    disabled={readOnly}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
              {donor.examination?.examined_by ? (
                <span>
                  Examined by {donor.examination.examined_by.name} at{" "}
                  <DateTime value={donor.examination.examined_at} />
                </span>
              ) : null}
              {donor.assessed_by && donor.assessed_at ? (
                <span>
                  Decided by {donor.assessed_by.name} at{" "}
                  <DateTime value={donor.assessed_at} />
                </span>
              ) : null}
            </div>
            {!readOnly ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={record.isPending}
                  onClick={() => form.reset(emptyExaminationValues)}
                >
                  <EraserIcon data-icon="inline-start" />
                  Clear
                </Button>
                <Button type="submit" disabled={record.isPending}>
                  {record.isPending ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <SaveIcon data-icon="inline-start" />
                  )}
                  Save
                </Button>
              </div>
            ) : null}
          </div>
        </Form>
      </CardContent>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirming(null)
          }
        }}
        title={`Defer ${donor.name ?? "this donor"}?`}
        description={
          confirming
            ? `The donor will be marked as deferred: "${confirming.deferral_reason}". No sample can be taken from them for this case.`
            : undefined
        }
        confirmLabel="Defer donor"
        destructive
        pending={record.isPending}
        onConfirm={() => {
          if (confirming) {
            save(confirming)
          }
        }}
      />
    </Card>
  )
}

/** Labelled input with a unit tag, one error line and an optional soft hint. */
function MeasurementField({
  control,
  name,
  id,
  label,
  unit,
  placeholder,
  inputMode,
  hint,
  disabled,
  required,
}: {
  control: Control<ExaminationFormValues>
  name: TextFieldName
  /** Unique per donor card: several cards share one page. */
  id: string
  label: string
  unit: string
  placeholder?: string
  inputMode: "decimal" | "numeric" | "text"
  hint?: string
  disabled: boolean
  required?: boolean
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>
            {label}
            {required ? <RequiredMark /> : null}
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id={id}
              name={field.name}
              ref={field.ref}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputMode={inputMode}
              placeholder={placeholder}
              autoComplete="off"
              disabled={disabled}
              aria-invalid={fieldState.invalid}
            />
            <InputGroupAddon align="inline-end">{unit}</InputGroupAddon>
          </InputGroup>
          {hint ? <FieldDescription>{hint}</FieldDescription> : null}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}
