"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { EraserIcon, LockIcon, SaveIcon, TestTubeIcon } from "lucide-react"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { ChoiceGroup, type ChoiceOption } from "@/components/choice-group"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { DateTime } from "@/components/date-time"
import { EnumSelect } from "@/components/enum-select"
import { Form } from "@/components/form"
import { RequiredMark } from "@/components/required-mark"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { hasErrorCode } from "@/lib/api-error"
import { SerologyStatusBadge } from "@/modules/blood-bank/donor-serology/components/serology-status-badge"
import {
  REACTIVE_DONOR_TEXT,
  SerologyErrorCode,
  serologyErrorText,
} from "@/modules/blood-bank/donor-serology/error-messages"
import { serologyLockReason } from "@/modules/blood-bank/donor-serology/lock-reason"
import { useRecordDonorSerology } from "@/modules/blood-bank/donor-serology/queries"
import {
  applySerologyErrors,
  emptySerologyValues,
  hasReactiveResult,
  serologyDefaults,
  serologySchema,
  toSerologyPayload,
  type SerologyFormValues,
} from "@/modules/blood-bank/donor-serology/schemas"
import {
  screeningTestLabels,
  screeningTests,
  type SerologyDonor,
} from "@/modules/blood-bank/donor-serology/types"
import {
  ScreeningResult,
  SerologyDecision,
  screeningResultLabels,
  serologyDecisionLabels,
  type CaseStatus,
} from "@/modules/blood-bank/enums"
import { bloodGroupLabels, genderLabels } from "@/modules/shared/patient/enums"

const screeningOptions: readonly ChoiceOption<ScreeningResult>[] = [
  {
    value: ScreeningResult.NonReactive,
    label: screeningResultLabels.non_reactive,
  },
  {
    value: ScreeningResult.Reactive,
    label: screeningResultLabels.reactive,
    tone: "destructive",
  },
]

/**
 * Changes whenever the saved row does, so right after a save the card restarts from the
 * server's values and shows them read-only, while unsaved input on the other donors is kept.
 */
export function serologyCardKey(donor: SerologyDonor): string {
  return [
    donor.case_donor_id,
    donor.case_donor_status,
    donor.serology?.version,
    donor.serology?.tested_at,
    donor.assessed_at,
    donor.can_record,
  ].join("|")
}

/**
 * One donor's serological investigation: blood group, four screening results and the
 * physician's Accept / Defer. A saved serology is shown read-only with no actions.
 */
export function DonorSerologyCard({
  caseId,
  caseStatus,
  donor,
  canRecord,
}: {
  caseId: number
  caseStatus: CaseStatus
  donor: SerologyDonor
  canRecord: boolean
}) {
  const record = useRecordDonorSerology(caseId)
  const saved = donor.serology
  const [confirming, setConfirming] = useState<SerologyFormValues | null>(null)

  const form = useForm<SerologyFormValues>({
    resolver: zodResolver(serologySchema),
    defaultValues: serologyDefaults(donor),
  })
  const { control } = form
  const values = useWatch({ control })
  const reactive = hasReactiveResult({
    hbsag: values.hbsag ?? "",
    anti_hcv: values.anti_hcv ?? "",
    anti_hiv: values.anti_hiv ?? "",
    syphilis: values.syphilis ?? "",
  })
  const deferring = values.decision === SerologyDecision.Deferred

  const lockReason = serologyLockReason(donor, caseStatus)
  const mayRecord = canRecord && donor.can_record
  // A saved serology (or a locked donor) is shown filled and disabled, with no actions.
  const editable = mayRecord && saved === null
  const readOnly = !editable
  const id = (name: string) => `serology_${name}_${donor.case_donor_id}`

  function save(formValues: SerologyFormValues) {
    const payload = toSerologyPayload(formValues)
    if (record.isPending || payload === null || donor.case_donor_id === null) {
      return
    }
    record.mutate(
      { caseId, caseDonorId: donor.case_donor_id, values: payload },
      {
        onSuccess: () => {
          setConfirming(null)
          toast.success(
            payload.decision === SerologyDecision.Accepted
              ? "Donor accepted"
              : "Donor deferred"
          )
        },
        onError: (error) => {
          setConfirming(null)
          if (
            hasErrorCode(error, SerologyErrorCode.ReactiveDonorNotAcceptable)
          ) {
            form.setError(
              "decision",
              { type: "server", message: REACTIVE_DONOR_TEXT },
              { shouldFocus: true }
            )
          } else if (!applySerologyErrors(error, form.setError)) {
            // The mutation hook reloads the screen for an out-of-date one (locked, case
            // closed, saved meanwhile by someone else).
            toast.error(serologyErrorText(error))
          }
        },
      }
    )
  }

  const submit = form.handleSubmit((formValues) => {
    // A deferral takes the donor out of this case, so it is confirmed first.
    if (formValues.decision === SerologyDecision.Deferred) {
      setConfirming(formValues)
    } else {
      save(formValues)
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
            <SerologyStatusBadge status={donor.case_donor_status} />
          ) : null}
          {saved && saved.version > 1 ? (
            <Badge variant="outline">Amended</Badge>
          ) : null}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {[
            donor.age !== null ? `${donor.age}y` : null,
            donor.gender ? genderLabels[donor.gender] : null,
            donor.blood_group ? bloodGroupLabels[donor.blood_group] : null,
            donor.phone,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <TestTubeIcon className="size-3.5" />
          {donor.sample ? (
            <span>
              <span className="font-medium text-foreground">
                {donor.sample.sample_no}
              </span>{" "}
              · collected <DateTime value={donor.sample.collected_at} />
            </span>
          ) : (
            <span>Sample not collected</span>
          )}
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {lockReason ? (
          <Alert>
            <LockIcon />
            <AlertDescription>{lockReason}</AlertDescription>
          </Alert>
        ) : null}

        {saved !== null || mayRecord ? (
          <Form
            onSubmit={submit}
            className="flex flex-col gap-4"
            aria-label={`Serology of donor ${donor.sequence_no ?? ""}`}
          >
            <Controller
              name="blood_group"
              control={control}
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  className="sm:max-w-xs"
                >
                  <FieldLabel htmlFor={id("blood_group")}>
                    Blood group
                    <RequiredMark />
                  </FieldLabel>
                  <EnumSelect
                    id={id("blood_group")}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    labels={bloodGroupLabels}
                    placeholder="Select blood group"
                    invalid={fieldState.invalid}
                    disabled={readOnly}
                  />
                  <FieldDescription>
                    Updates the donor&apos;s blood group.
                  </FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {screeningTests.map((test) => (
                <Controller
                  key={test}
                  name={test}
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldTitle id={id(`${test}_label`)}>
                        {screeningTestLabels[test]}
                        <RequiredMark />
                      </FieldTitle>
                      <ChoiceGroup
                        id={id(test)}
                        ref={field.ref}
                        value={field.value}
                        onChange={(next) => {
                          field.onChange(next)
                          // A reactive donor can only be deferred.
                          if (next === ScreeningResult.Reactive) {
                            form.setValue(
                              "decision",
                              SerologyDecision.Deferred,
                              {
                                shouldDirty: true,
                                shouldValidate: form.formState.isSubmitted,
                              }
                            )
                          }
                        }}
                        onBlur={field.onBlur}
                        options={screeningOptions}
                        disabled={readOnly}
                        invalid={fieldState.invalid}
                        aria-labelledby={id(`${test}_label`)}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              ))}
            </div>

            <Controller
              name="decision"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldTitle id={id("decision_label")}>
                    Decision
                    <RequiredMark />
                  </FieldTitle>
                  <ChoiceGroup
                    id={id("decision")}
                    ref={field.ref}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    options={[
                      {
                        value: SerologyDecision.Accepted,
                        label: serologyDecisionLabels.accepted,
                        tone: "success",
                        disabled: reactive,
                      },
                      {
                        value: SerologyDecision.Deferred,
                        label: serologyDecisionLabels.deferred,
                        tone: "destructive",
                      },
                    ]}
                    disabled={readOnly}
                    invalid={fieldState.invalid}
                    aria-labelledby={id("decision_label")}
                  />
                  {reactive && !readOnly ? (
                    <FieldDescription className="text-destructive">
                      {REACTIVE_DONOR_TEXT}
                    </FieldDescription>
                  ) : null}
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            {deferring ? (
              <Controller
                name="deferral_reason"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={id("deferral_reason")}>
                      Reason for deferral
                      <RequiredMark />
                    </FieldLabel>
                    <Textarea
                      id={id("deferral_reason")}
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
                {saved?.tested_by ? (
                  <span>
                    Tested by {saved.tested_by.name} at{" "}
                    <DateTime value={saved.tested_at} />
                  </span>
                ) : null}
                {saved && donor.assessed_by && donor.assessed_at ? (
                  <span>
                    Decided by {donor.assessed_by.name} at{" "}
                    <DateTime value={donor.assessed_at} />
                  </span>
                ) : null}
              </div>
              {editable ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={record.isPending}
                    onClick={() => form.reset(emptySerologyValues)}
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
        ) : null}
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
            ? `The donor will be marked as deferred: "${confirming.deferral_reason}". No blood can be collected from them for this case.`
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
