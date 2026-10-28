"use client"

import { DateTime } from "@/components/date-time"
import { Money } from "@/components/money"
import { PageHeader } from "@/components/page-header"
import { QueryError } from "@/components/query-error"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CaseStatusBadge } from "@/modules/blood-bank/cases/components/case-status-badge"
import { useCase } from "@/modules/blood-bank/cases/queries"
import type { CasePatient } from "@/modules/blood-bank/cases/types"
import {
  careTypeLabels,
  caseDonorStatusLabels,
} from "@/modules/blood-bank/enums"
import { useBreadcrumbLabel } from "@/modules/shared/layout/breadcrumbs"
import {
  bloodGroupLabels,
  genderLabels,
  patientTitleLabels,
} from "@/modules/shared/patient/enums"

function patientAge(patient: CasePatient): string | null {
  const parts = [
    patient.age_years ? `${patient.age_years}y` : null,
    patient.age_months ? `${patient.age_months}m` : null,
    patient.age_days ? `${patient.age_days}d` : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(" ") : null
}

export function CaseDetail({ caseId }: { caseId: number }) {
  const query = useCase(caseId)
  useBreadcrumbLabel(String(caseId), query.data?.case_no)

  if (query.isPending) {
    return <Skeleton className="h-96 w-full" />
  }
  if (query.isError) {
    return <QueryError error={query.error} onRetry={() => query.refetch()} />
  }

  const record = query.data
  const { patient, invoice } = record

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Case {record.case_no}
            <CaseStatusBadge status={record.status} />
          </span>
        }
        description={
          <>
            Registered <DateTime value={record.created_at} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Patient</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <Detail label="Patient no" value={patient?.patient_no} />
              <Detail
                label="Name"
                value={
                  patient
                    ? [
                        patient.title
                          ? patientTitleLabels[patient.title]
                          : null,
                        patient.name,
                      ]
                        .filter(Boolean)
                        .join(" ")
                    : null
                }
              />
              <Detail
                label="Age"
                value={patient ? patientAge(patient) : null}
              />
              <Detail
                label="Gender"
                value={patient?.gender ? genderLabels[patient.gender] : null}
              />
              <Detail
                label="Blood group"
                value={
                  patient?.blood_group
                    ? bloodGroupLabels[patient.blood_group]
                    : null
                }
              />
              <Detail label="Phone" value={patient?.phone} />
              <Detail label="Address" value={patient?.address} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <Detail label="Invoice no" value={invoice?.invoice_no} />
              <Detail
                label="Amount"
                value={invoice ? <Money paisa={invoice.amount} /> : null}
              />
              <Detail
                label="Billed"
                value={invoice ? <DateTime value={invoice.billed_at} /> : null}
              />
              <Detail
                label="Referred by"
                value={
                  invoice?.is_self_referral ? "Self" : invoice?.referred_by
                }
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Case</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <Detail
                label="Care of"
                value={careTypeLabels[record.care_type]}
              />
              <Detail
                label="Cause of transfusion"
                value={record.transfusion_reason}
              />
              <Detail label="Reference note" value={record.reference_note} />
              <Detail
                label="Supply time"
                value={<DateTime value={record.supplied_at} />}
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requested components</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {record.components.length === 0 ? (
                <EmptyRow colSpan={2} text="No components requested." />
              ) : (
                record.components.map((line) => (
                  <TableRow key={line.component_type_id}>
                    <TableCell>
                      {line.code} · {line.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {line.quantity}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Donors</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead>Blood group</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(record.donors ?? []).length === 0 ? (
                <EmptyRow colSpan={5} text="No donors." />
              ) : (
                (record.donors ?? []).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="tabular-nums">
                      {entry.sequence_no}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{entry.donor.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {entry.donor.donor_no}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.donor.blood_group
                        ? bloodGroupLabels[entry.donor.blood_group]
                        : "—"}
                    </TableCell>
                    <TableCell>{entry.donor.phone ?? "—"}</TableCell>
                    <TableCell>{caseDonorStatusLabels[entry.status]}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value ?? "—"}</dd>
    </>
  )
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="text-center text-muted-foreground"
      >
        {text}
      </TableCell>
    </TableRow>
  )
}
