"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { PlusIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  Controller,
  FormProvider,
  useFieldArray,
  useForm,
} from "react-hook-form"
import { toast } from "sonner"

import { Form } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
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
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/api-error"
import { applyServerErrors } from "@/lib/form-errors"
import { CaseDetailsFields } from "@/modules/blood-bank/cases/components/case-details-fields"
import { caseErrorMessages } from "@/modules/blood-bank/cases/error-messages"
import { useCreateCase } from "@/modules/blood-bank/cases/queries"
import {
  caseCreateSchema,
  type CaseCreateValues,
} from "@/modules/blood-bank/cases/schemas"
import { useActiveComponentTypes } from "@/modules/blood-bank/component-types/queries"
import { PatientCombobox } from "@/modules/shared/patient/components/patient-combobox"

export function CaseCreateForm() {
  const router = useRouter()
  const createCase = useCreateCase()
  const componentTypes = useActiveComponentTypes()

  const form = useForm<CaseCreateValues>({
    resolver: zodResolver(caseCreateSchema),
    defaultValues: {
      transfusion_reason: "",
      reference_note: "",
      components: [{ quantity: 1 } as CaseCreateValues["components"][number]],
    },
  })
  const components = useFieldArray({
    control: form.control,
    name: "components",
  })

  function onSubmit(values: CaseCreateValues) {
    createCase.mutate(values, {
      onSuccess: (record) => {
        toast.success(`Case ${record.case_no} opened`)
        router.push(`/blood-bank/cases/${record.id}`)
      },
      onError: (error) => {
        if (!applyServerErrors(error, form.setError)) {
          toast.error(errorMessage(error, caseErrorMessages))
        }
      },
    })
  }

  return (
    <FormProvider {...form}>
      <Form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Patient and case</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                name="patient_master_id"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="patient_master_id">Patient</FieldLabel>
                    <PatientCombobox
                      id="patient_master_id"
                      value={field.value}
                      onChange={field.onChange}
                      invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <CaseDetailsFields />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requested components</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {components.fields.map((line, index) => (
              <div key={line.id} className="flex items-start gap-3">
                <Controller
                  name={`components.${index}.component_type_id`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="flex-1">
                      <FieldLabel
                        htmlFor={`component-${index}`}
                        className="sr-only"
                      >
                        Component
                      </FieldLabel>
                      <Select
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(value) => field.onChange(Number(value))}
                        disabled={componentTypes.isPending}
                      >
                        <SelectTrigger
                          id={`component-${index}`}
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue placeholder="Component" />
                        </SelectTrigger>
                        <SelectContent>
                          {(componentTypes.data ?? []).map((type) => (
                            <SelectItem key={type.id} value={String(type.id)}>
                              {type.code} · {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  name={`components.${index}.quantity`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="w-28">
                      <FieldLabel
                        htmlFor={`quantity-${index}`}
                        className="sr-only"
                      >
                        Quantity
                      </FieldLabel>
                      <Input
                        id={`quantity-${index}`}
                        type="number"
                        min={1}
                        inputMode="numeric"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={
                          Number.isNaN(field.value) ? "" : (field.value ?? "")
                        }
                        onChange={(event) =>
                          field.onChange(event.target.valueAsNumber)
                        }
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove component"
                  disabled={components.fields.length === 1}
                  onClick={() => components.remove(index)}
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))}
            <FieldError
              errors={[
                form.formState.errors.components?.root ??
                  form.formState.errors.components,
              ]}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() =>
                components.append({
                  quantity: 1,
                } as CaseCreateValues["components"][number])
              }
            >
              <PlusIcon data-icon="inline-start" />
              Add component
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={createCase.isPending}>
            {createCase.isPending ? <Spinner /> : null}
            Open case
          </Button>
        </div>
      </Form>
    </FormProvider>
  )
}
