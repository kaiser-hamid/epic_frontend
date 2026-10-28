"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { FormProvider, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Form } from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/api-error"
import { applyServerErrors } from "@/lib/form-errors"
import {
  CaseReferralFields,
  CaseTestItemsFields,
} from "@/modules/blood-bank/cases/components/case-billing-fields"
import { CaseComponentsFields } from "@/modules/blood-bank/cases/components/case-components-fields"
import { CaseDetailsFields } from "@/modules/blood-bank/cases/components/case-details-fields"
import { CaseDonorsFields } from "@/modules/blood-bank/cases/components/case-donors-fields"
import { CasePatientFields } from "@/modules/blood-bank/cases/components/case-patient-fields"
import { caseErrorMessages } from "@/modules/blood-bank/cases/error-messages"
import { useCreateCase } from "@/modules/blood-bank/cases/queries"
import {
  caseCreateSchema,
  emptyNewPatient,
  PatientMode,
  type CaseCreateValues,
} from "@/modules/blood-bank/cases/schemas"

type TestLine = CaseCreateValues["billing"]["items"][number]

/** One save registers the patient (if new), bill, case, components and donors. */
export function CaseCreateForm() {
  const router = useRouter()
  const createCase = useCreateCase()

  const form = useForm<CaseCreateValues>({
    resolver: zodResolver(caseCreateSchema),
    defaultValues: {
      patient_mode: PatientMode.New,
      billing: {
        patient: emptyNewPatient,
        items: [{ quantity: 1 } as TestLine],
        referral: { is_self_referral: false, remark: "" },
      },
      transfusion_reason: "",
      reference_note: "",
      components: [],
      donors: [],
    },
  })

  function onSubmit(values: CaseCreateValues) {
    createCase.mutate(values, {
      onSuccess: (record) => {
        toast.success(`Case ${record.case_no} registered`)
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
            <CardTitle>Patient</CardTitle>
          </CardHeader>
          <CardContent>
            <CasePatientFields />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tests</CardTitle>
            <CardDescription>
              Billed on the invoice. The server calculates the total.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CaseTestItemsFields />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Referral</CardTitle>
          </CardHeader>
          <CardContent>
            <CaseReferralFields />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Case</CardTitle>
          </CardHeader>
          <CardContent>
            <CaseDetailsFields />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requested components</CardTitle>
          </CardHeader>
          <CardContent>
            <CaseComponentsFields />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Donors</CardTitle>
          </CardHeader>
          <CardContent>
            <CaseDonorsFields />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={createCase.isPending}>
            {createCase.isPending ? <Spinner /> : null}
            Register case
          </Button>
        </div>
      </Form>
    </FormProvider>
  )
}
