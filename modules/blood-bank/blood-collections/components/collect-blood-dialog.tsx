"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { DropletIcon } from "lucide-react"
import { Controller, useForm, type UseFormSetError } from "react-hook-form"
import { toast } from "sonner"

import { DateTimeInput } from "@/components/date-time-input"
import { Form } from "@/components/form"
import { NumberInput } from "@/components/number-input"
import { RequiredMark } from "@/components/required-mark"
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
  VOLUME_ML,
  type CollectBloodValues,
} from "@/modules/blood-bank/blood-collections/schemas"
import type {
  BloodCollection,
  CollectionDonor,
} from "@/modules/blood-bank/blood-collections/types"

/**
 * "Collect" for one eligible donor: the volume drawn, optional notes, and when (empty is now;
 * may be back-dated). `onCollected` gets the refreshed screen, whose `collected_collection_id`
 * is the new bag.
 */
export function CollectBloodDialog({
  caseId,
  donor,
  onOpenChange,
  onCollected,
}: {
  caseId: number
  /** The donor to collect from; null keeps the dialog closed. */
  donor: CollectionDonor | null
  onOpenChange: (open: boolean) => void
  onCollected: (view: BloodCollection) => void
}) {
  const collect = useCollectBlood(caseId)

  return (
    <Dialog
      open={donor !== null}
      onOpenChange={collect.isPending ? undefined : onOpenChange}
    >
      <DialogContent>
        {donor ? (
          <CollectBloodForm
            // The content unmounts on close, so each opening starts from the defaults.
            key={donor.case_donor_id}
            donor={donor}
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
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function CollectBloodForm({
  donor,
  isPending,
  onCancel,
  onSubmit,
}: {
  donor: CollectionDonor
  isPending: boolean
  onCancel: () => void
  onSubmit: (
    values: CollectBloodValues,
    setError: UseFormSetError<CollectBloodValues>
  ) => void
}) {
  const form = useForm<CollectBloodValues>({
    resolver: zodResolver(collectBloodSchema),
    defaultValues: defaultCollectBloodValues,
  })
  const { control } = form

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

      <Controller
        name="volume_ml"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="collect_volume_ml">
              Volume (ml)
              <RequiredMark />
            </FieldLabel>
            <NumberInput
              id="collect_volume_ml"
              name={field.name}
              ref={field.ref}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              max={VOLUME_ML.max}
              autoFocus
              className="sm:max-w-32"
              aria-invalid={fieldState.invalid}
            />
            <FieldDescription>
              {VOLUME_ML.min}–{VOLUME_ML.max} ml.
            </FieldDescription>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

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
              autoComplete="off"
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
            <DropletIcon data-icon="inline-start" />
          )}
          Collect
        </Button>
      </DialogFooter>
    </Form>
  )
}
