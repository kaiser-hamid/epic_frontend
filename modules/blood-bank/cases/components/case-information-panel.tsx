"use client"

import { DateTime } from "@/components/date-time"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { CaseStatusBadge } from "@/modules/blood-bank/cases/components/case-status-badge"
import type {
  BloodBankCase,
  CaseInvoice,
  CasePatient,
} from "@/modules/blood-bank/cases/types"
import { careTypeLabels } from "@/modules/blood-bank/enums"
import { componentsSummary } from "@/modules/blood-bank/samples/format"
import {
  bloodGroupLabels,
  genderLabels,
  patientTitleLabels,
} from "@/modules/shared/patient/enums"
import { formatPatientAge } from "@/modules/shared/patient/format"

/** The case fields the panel shows (every screen's `case` object has them). */
export type CaseInformation = Pick<
  BloodBankCase,
  | "case_no"
  | "status"
  | "care_type"
  | "transfusion_reason"
  | "reference_note"
  | "components"
>

/**
 * The patient information card on top of the Sample Collection and Donor Examination
 * screens. Empty fields show an em dash.
 */
export function CaseInformationPanel({
  record,
  patient,
  invoice,
  isLoading,
}: {
  record: CaseInformation | null | undefined
  patient: CasePatient | null | undefined
  invoice: CaseInvoice | null | undefined
  isLoading: boolean
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Patient information
          {record ? <CaseStatusBadge status={record.status} /> : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 2xl:grid-cols-4">
            <Info label="Patient no" value={patient?.patient_no} />
            <Info label="Invoice no" value={invoice?.invoice_no} />
            <Info
              label="Invoice date"
              value={
                invoice ? <DateTime value={invoice.billed_at} /> : undefined
              }
            />
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
              label="Age"
              value={patient ? formatPatientAge(patient) : undefined}
            />
            <Info
              label="Gender"
              value={patient?.gender ? genderLabels[patient.gender] : undefined}
            />
            <Info
              label="Blood group"
              value={
                patient?.blood_group
                  ? bloodGroupLabels[patient.blood_group]
                  : undefined
              }
            />
            <Info label="Phone mobile" value={patient?.phone} />
            <Info
              label="Ref. doc. name"
              value={
                invoice
                  ? invoice.is_self_referral
                    ? "Self"
                    : invoice.referred_by
                  : undefined
              }
            />
            <Info label="Case no" value={record?.case_no} />
            <Info
              label="Care of"
              value={record ? careTypeLabels[record.care_type] : undefined}
            />
            <Info
              label="Cause of transfusion"
              value={record?.transfusion_reason}
            />
            <Info label="Remarks" value={record?.reference_note} />
            <Info
              label="Components requested"
              value={record ? componentsSummary(record.components) : undefined}
              className="col-span-2"
            />
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
