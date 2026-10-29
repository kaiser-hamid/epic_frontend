"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
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
import { CaseDetailsFields } from "@/modules/blood-bank/cases/components/case-details-fields"
import { CaseDonorsFields } from "@/modules/blood-bank/cases/components/case-donors-fields"
import { CasePatientFields } from "@/modules/blood-bank/cases/components/case-patient-fields"
import { CaseReferralFields } from "@/modules/blood-bank/cases/components/case-referral-fields"
import { CaseTestItemsFields } from "@/modules/blood-bank/cases/components/case-test-items-fields"
import { caseErrorMessages } from "@/modules/blood-bank/cases/error-messages"
import { useCreateCase } from "@/modules/blood-bank/cases/queries"
import {
  caseCreateSchema,
  emptyCaseDonor,
  emptyNewPatient,
  type CaseCreateValues,
} from "@/modules/blood-bank/cases/schemas"

type TestLine = CaseCreateValues["billing"]["items"][number]

/**
 * One save registers the patient (if new), bill, case, components and donors. The page
 * stays mounted when the user navigates away and back, so after a save the form is
 * remounted (new key) to drop every value, including the lookup state inside the fields.
 */
export function CaseCreateForm() {
  const [session, setSession] = useState(0)
  return (
    <CaseRegistrationForm
      key={session}
      onRegistered={() => setSession((current) => current + 1)}
    />
  )
}

function CaseRegistrationForm({ onRegistered }: { onRegistered: () => void }) {
  const router = useRouter()
  const createCase = useCreateCase()

  const form = useForm<CaseCreateValues>({
    resolver: zodResolver(caseCreateSchema),
    defaultValues: {
      billing: {
        patient: emptyNewPatient,
        items: [{ quantity: 1 } as TestLine],
        referral: { is_self_referral: false, remark: "" },
      },
      transfusion_reason: "",
      reference_note: "",
      components: [],
      donors: [emptyCaseDonor],
    },
  })

  function onSubmit(values: CaseCreateValues) {
    createCase.mutate(values, {
      onSuccess: (record) => {
        toast.success(`Case ${record.case_no} registered`)
        router.push(`/blood-bank/cases/${record.id}`)
        onRegistered()
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
        {/* DOM order is the Enter order: left column, then right, row by row. */}
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
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
              <CardTitle>Referral</CardTitle>
            </CardHeader>
            <CardContent>
              <CaseReferralFields />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tests</CardTitle>
            <CardDescription>
              Amounts use the current catalog rate; the invoice total is
              calculated on save.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CaseTestItemsFields />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
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
              <CardTitle>Donors</CardTitle>
            </CardHeader>
            <CardContent>
              <CaseDonorsFields />
            </CardContent>
          </Card>
        </div>

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
