"use client"

import { PencilIcon } from "lucide-react"
import Link from "next/link"

import { DateTime } from "@/components/date-time"
import { PageHeader } from "@/components/page-header"
import { QueryError } from "@/components/query-error"
import { Button } from "@/components/ui/button"
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
import { CaseCancelButton } from "@/modules/blood-bank/cases/components/case-cancel-button"
import { CaseStatusBadge } from "@/modules/blood-bank/cases/components/case-status-badge"
import { useCase } from "@/modules/blood-bank/cases/queries"
import { careTypeLabels } from "@/modules/blood-bank/enums"
import { useBreadcrumbLabel } from "@/modules/shared/layout/breadcrumbs"

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
            Opened <DateTime value={record.created_at} />
          </>
        }
        actions={
          <>
            {record.abilities.update ? (
              <Button variant="outline" asChild>
                <Link href={`/blood-bank/cases/${record.id}/edit`}>
                  <PencilIcon data-icon="inline-start" />
                  Edit
                </Link>
              </Button>
            ) : null}
            <CaseCancelButton record={record} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Patient</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <Detail label="Patient no" value={record.patient?.patient_no} />
              <Detail label="Name" value={record.patient?.name} />
              <Detail label="Age" value={record.patient?.age} />
              <Detail label="Gender" value={record.patient?.gender} />
              <Detail label="Phone" value={record.patient?.phone} />
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
                <TableHead className="text-right">Requested</TableHead>
                <TableHead className="text-right">Assigned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(record.components ?? []).map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    {line.component_type
                      ? `${line.component_type.code} · ${line.component_type.name}`
                      : line.component_type_id}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {line.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {line.assigned_quantity}
                  </TableCell>
                </TableRow>
              ))}
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
