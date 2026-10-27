"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { FormProvider, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Forbidden } from "@/components/forbidden"
import { Form } from "@/components/form"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FieldGroup } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/api-error"
import { pickDirty } from "@/lib/dirty-values"
import { applyServerErrors } from "@/lib/form-errors"
import { CaseDetailsFields } from "@/modules/blood-bank/cases/components/case-details-fields"
import { caseErrorMessages } from "@/modules/blood-bank/cases/error-messages"
import { useCase, useUpdateCase } from "@/modules/blood-bank/cases/queries"
import {
  caseUpdateSchema,
  type CaseUpdateValues,
} from "@/modules/blood-bank/cases/schemas"
import type { BloodBankCase } from "@/modules/blood-bank/cases/types"
import { useBreadcrumbLabel } from "@/modules/shared/layout/breadcrumbs"

export function CaseEditForm({ caseId }: { caseId: number }) {
  const query = useCase(caseId)
  useBreadcrumbLabel(String(caseId), query.data?.case_no)

  if (query.isPending) {
    return <Skeleton className="h-64 w-full" />
  }
  if (query.isError) {
    return <QueryError error={query.error} onRetry={() => query.refetch()} />
  }
  if (!query.data.abilities.update) {
    return <Forbidden description="This case can no longer be edited." />
  }

  return <CaseEditFormInner record={query.data} />
}

function CaseEditFormInner({ record }: { record: BloodBankCase }) {
  const router = useRouter()
  const updateCase = useUpdateCase(record.id)

  const form = useForm<CaseUpdateValues>({
    resolver: zodResolver(caseUpdateSchema),
    defaultValues: {
      care_type: record.care_type,
      transfusion_reason: record.transfusion_reason ?? "",
      reference_note: record.reference_note ?? "",
    },
  })

  function onSubmit(values: CaseUpdateValues) {
    const changes = pickDirty(values, form.formState.dirtyFields)
    if (Object.keys(changes).length === 0) {
      router.push(`/blood-bank/cases/${record.id}`)
      return
    }

    updateCase.mutate(changes, {
      onSuccess: () => {
        toast.success(`Case ${record.case_no} updated`)
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
          <CardContent>
            <FieldGroup>
              <CaseDetailsFields />
            </FieldGroup>
          </CardContent>
        </Card>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={updateCase.isPending}>
            {updateCase.isPending ? <Spinner /> : null}
            Save changes
          </Button>
        </div>
      </Form>
    </FormProvider>
  )
}
