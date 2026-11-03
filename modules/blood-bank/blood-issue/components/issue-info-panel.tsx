import { DateTime } from "@/components/date-time"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { BloodIssue } from "@/modules/blood-bank/blood-issue/types"
import { CaseStatusBadge } from "@/modules/blood-bank/cases/components/case-status-badge"
import { careTypeLabels } from "@/modules/blood-bank/enums"
import {
  genderLabels,
  patientTitleLabels,
} from "@/modules/shared/patient/enums"
import { formatPatientAge } from "@/modules/shared/patient/format"

/**
 * The case (no, status, care type, cause of transfusion, supply time), its patient and its
 * invoice. Empty fields show an em dash.
 */
export function IssueInfoPanel({
  view,
  isLoading,
}: {
  view: BloodIssue | undefined
  isLoading: boolean
}) {
  const record = view?.case
  const patient = view?.patient
  const invoice = view?.invoice

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Case information
          {record ? <CaseStatusBadge status={record.status} /> : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 2xl:grid-cols-4">
            <Info label="Case no" value={record?.case_no} />
            <Info
              label="Care of"
              value={record ? careTypeLabels[record.care_type] : undefined}
            />
            <Info
              label="Cause of transfusion"
              value={record?.transfusion_reason}
            />
            <Info
              label="Supply time"
              value={
                record?.supplied_at ? (
                  <DateTime value={record.supplied_at} />
                ) : undefined
              }
            />

            <Info label="Patient no" value={patient?.patient_no} />
            <Info
              label="Patient name"
              value={
                patient
                  ? [
                      patient.title ? patientTitleLabels[patient.title] : null,
                      patient.name,
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : undefined
              }
            />
            <Info
              label="Age / gender"
              value={
                patient
                  ? [
                      formatPatientAge(patient),
                      patient.gender ? genderLabels[patient.gender] : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  : undefined
              }
            />
            <Info label="Phone mobile" value={patient?.phone} />

            <Info label="Invoice no" value={invoice?.invoice_no} />
            <Info
              label="Invoice date"
              value={
                invoice ? <DateTime value={invoice.billed_at} /> : undefined
              }
            />
            <Info
              label="Ref. by"
              value={
                invoice
                  ? invoice.is_self_referral
                    ? "Self"
                    : invoice.referred_by
                  : undefined
              }
            />
            <Info label="Remarks" value={record?.reference_note} />
          </dl>
        )}
      </CardContent>
    </Card>
  )
}

function Info({
  label,
  value,
  className,
}: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value ?? "—"}</dd>
    </div>
  )
}
