"use client"

import { DateTime } from "@/components/date-time"
import {
  DetailCardSkeleton,
  PageHeaderSkeleton,
} from "@/components/detail-skeleton"
import { Money } from "@/components/money"
import { PageHeader } from "@/components/page-header"
import { QueryError } from "@/components/query-error"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  BillingStatus,
  billingStatusLabels,
} from "@/modules/shared/billing/enums"
import { InvoicePrintButtons } from "@/modules/shared/billing/invoices/components/invoice-print-actions"
import { useInvoice } from "@/modules/shared/billing/invoices/queries"
import { useBreadcrumbLabel } from "@/modules/shared/layout/breadcrumbs"
import { genderLabels } from "@/modules/shared/patient/enums"
import { formatPatientAge } from "@/modules/shared/patient/format"
import {
  TestItemCategory,
  testItemCategoryLabels,
} from "@/modules/shared/test-catalog/enums"

/** A saved invoice, read-only (no edit or cancel yet), with its preview and print actions. */
export function InvoiceDetail({ invoiceId }: { invoiceId: number }) {
  const query = useInvoice(invoiceId)
  useBreadcrumbLabel(String(invoiceId), query.data?.invoice_no)

  if (query.isPending) {
    return <InvoiceDetailSkeleton />
  }
  if (query.isError) {
    return <QueryError error={query.error} onRetry={() => query.refetch()} />
  }

  const record = query.data
  const { patient, referral } = record

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Invoice {record.invoice_no}
            {record.categories?.includes(TestItemCategory.BloodBank) ? (
              <Badge variant="secondary">
                {testItemCategoryLabels.blood_bank}
              </Badge>
            ) : null}
            {record.status === BillingStatus.Cancelled ? (
              <Badge variant="destructive">
                {billingStatusLabels.cancelled}
              </Badge>
            ) : null}
          </span>
        }
        description={
          <>
            Invoiced <DateTime value={record.billed_at} />
            {record.created_by ? ` by ${record.created_by.name}` : ""}
          </>
        }
        actions={
          <InvoicePrintButtons
            invoiceId={record.id}
            invoiceNo={record.invoice_no}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Patient</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <Detail label="Patient no" value={patient?.patient_no} />
              <Detail label="Name" value={patient?.name} />
              <Detail
                label="Age"
                value={patient ? formatPatientAge(patient) : null}
              />
              <Detail
                label="Gender"
                value={patient?.gender ? genderLabels[patient.gender] : null}
              />
              <Detail label="Phone" value={patient?.phone} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <Detail label="Patient type" value={record.patient_type?.name} />
              <Detail
                label="Discount"
                value={record.discount?.name ?? "No discount"}
              />
              <Detail
                label="Referred by"
                value={
                  referral?.is_self_referral ? "Self" : referral?.doctor?.name
                }
              />
              <Detail label="Remark" value={referral?.remark} />
              <Detail
                label="Delivery"
                value={
                  record.delivery_at ? (
                    <DateTime value={record.delivery_at} />
                  ) : null
                }
              />
              <Detail
                label="Payment"
                value={
                  record.due_amount === 0 ? (
                    <Badge variant="secondary">Paid</Badge>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">Due</Badge>
                      <Money paisa={record.due_amount} />
                    </span>
                  )
                }
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Sl</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Test</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(record.items ?? []).map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {index + 1}
                  </TableCell>
                  <TableCell>{item.code}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="text-right">
                    <Money paisa={item.rate} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money paisa={item.amount} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Money paisa={item.discount_amount} />
                    {item.discount_percent ? (
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({item.discount_percent}%)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <Money paisa={item.net_amount} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TotalRow label="Subtotal" paisa={record.subtotal_amount} />
              <TotalRow
                label="Discount"
                paisa={record.discount_amount}
                negative
              />
              <TotalRow
                label="Rounding"
                paisa={Math.abs(record.rounding_amount)}
                negative={record.rounding_amount < 0}
              />
              <TotalRow label="Payable" paisa={record.amount} strong />
              <TotalRow label="Paid" paisa={record.paid_amount} />
              <TotalRow label="Due" paisa={record.due_amount} strong />
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

const patientLabels = ["Patient no", "Name", "Age", "Gender", "Phone"]
const invoiceLabels = [
  "Patient type",
  "Discount",
  "Referred by",
  "Remark",
  "Delivery",
  "Payment",
]
const totalLabels = [
  "Subtotal",
  "Discount",
  "Rounding",
  "Payable",
  "Paid",
  "Due",
]
const amountHeads = ["Qty", "Rate", "Amount", "Discount", "Net"]

/** Same frame as the loaded invoice: static labels and headings, placeholders for the values. */
function InvoiceDetailSkeleton() {
  return (
    <div
      className="flex flex-col gap-6"
      aria-busy="true"
      aria-label="Loading invoice"
    >
      <PageHeaderSkeleton actions={["w-24", "w-20"]} />

      <div className="grid gap-6 lg:grid-cols-2">
        <DetailCardSkeleton title="Patient" labels={patientLabels} />
        <DetailCardSkeleton title="Invoice" labels={invoiceLabels} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">Sl</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Test</TableHead>
                {amountHeads.map((head) => (
                  <TableHead key={head} className="text-right">
                    {head}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[0, 1].map((row) => (
                <TableRow key={row}>
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  {amountHeads.map((head) => (
                    <TableCell key={head}>
                      <Skeleton
                        className={cn(
                          "ml-auto h-4",
                          head === "Qty" ? "w-4" : "w-16"
                        )}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              {totalLabels.map((label) => (
                <TableRow key={label}>
                  <TableCell colSpan={7} className="text-right">
                    {label}
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-4 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function TotalRow({
  label,
  paisa,
  negative = false,
  strong = false,
}: {
  label: string
  paisa: number
  negative?: boolean
  strong?: boolean
}) {
  return (
    <TableRow className={strong ? "font-semibold" : undefined}>
      <TableCell colSpan={7} className="text-right">
        {label}
      </TableCell>
      <TableCell className="text-right">
        {negative ? "− " : ""}
        <Money paisa={paisa} />
      </TableCell>
    </TableRow>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        {value === null || value === undefined || value === "" ? "—" : value}
      </dd>
    </>
  )
}
