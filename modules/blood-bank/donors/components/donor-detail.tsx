"use client"

import Link from "next/link"

import { DateTime } from "@/components/date-time"
import { PageHeader } from "@/components/page-header"
import { QueryError } from "@/components/query-error"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ErrorCode, hasErrorCode } from "@/lib/api-error"
import { DonationStatusBadge } from "@/modules/blood-bank/donors/components/donation-status-badge"
import { useDonor } from "@/modules/blood-bank/donors/queries"
import type {
  Donation,
  DonationCollection,
  DonorDetail,
} from "@/modules/blood-bank/donors/types"
import {
  CaseDonorStatus,
  CollectionStatus,
  careTypeLabels,
} from "@/modules/blood-bank/enums"
import { BloodBankPermission } from "@/modules/blood-bank/permissions"
import { useMe } from "@/modules/shared/auth/queries"
import { useBreadcrumbLabel } from "@/modules/shared/layout/breadcrumbs"
import { bloodGroupLabels, genderLabels } from "@/modules/shared/patient/enums"
import { useCan } from "@/modules/shared/rbac/use-can"

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value ?? "—"}</dd>
    </>
  )
}

function liveCollection(donation: Donation): DonationCollection | undefined {
  return donation.collections.find(
    (collection) => collection.status === CollectionStatus.Collected
  )
}

/** Date of the donation: the bag's collection when there is one, else the registration. */
function donationDate(donation: Donation): string {
  return liveCollection(donation)?.collected_at ?? donation.registered_at
}

/** Counts shown above the history. Derived from `donations` only. */
function summarize(donations: Donation[]) {
  const collectedAt = donations
    .map((donation) => liveCollection(donation)?.collected_at)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  const count = (status: CaseDonorStatus) =>
    donations.filter((donation) => donation.status === status).length
  return {
    registered: donations.length,
    donated: count(CaseDonorStatus.Collected),
    deferred: count(CaseDonorStatus.Deferred),
    lastDonation: collectedAt[0] ?? null,
  }
}

function times(count: number) {
  return `${count} time${count === 1 ? "" : "s"}`
}

export function DonorDetailView({ donorId }: { donorId: number }) {
  const query = useDonor(donorId)
  useBreadcrumbLabel(String(donorId), query.data?.donor_no)

  if (query.isPending) {
    return <Skeleton className="h-96 w-full" />
  }
  if (query.isError) {
    if (hasErrorCode(query.error, ErrorCode.NotFound)) {
      return (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Donor not found</EmptyTitle>
            <EmptyDescription>
              It may have been removed, or the link is wrong.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )
    }
    return <QueryError error={query.error} onRetry={() => query.refetch()} />
  }

  const donor = query.data
  const summary = summarize(donor.donations)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={donor.name}
        description={
          <>
            {donor.donor_no} · Registered <DateTime value={donor.created_at} />
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Donor</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm md:grid-cols-[auto_1fr_auto_1fr]">
            <Detail label="Age" value={donor.age} />
            <Detail
              label="Date of birth"
              value={
                donor.date_of_birth ? (
                  <DateTime value={donor.date_of_birth} dateOnly />
                ) : null
              }
            />
            <Detail
              label="Gender"
              value={donor.gender ? genderLabels[donor.gender] : null}
            />
            <Detail
              label="Blood group"
              value={
                donor.blood_group ? bloodGroupLabels[donor.blood_group] : null
              }
            />
            <Detail label="Phone" value={donor.phone} />
            <Detail label="National ID" value={donor.national_id} />
            <Detail label="Address" value={donor.address} />
            <Detail
              label="Regular volunteer"
              value={
                donor.is_regular_volunteer === null
                  ? null
                  : donor.is_regular_volunteer
                    ? "Yes"
                    : "No"
              }
            />
          </dl>
          <p className="text-sm text-muted-foreground">
            Registered {times(summary.registered)} · donated{" "}
            {times(summary.donated)} · deferred {times(summary.deferred)} · last
            donation <DateTime value={summary.lastDonation} dateOnly />
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Donation history</CardTitle>
        </CardHeader>
        <CardContent>
          <DonationHistory donor={donor} />
        </CardContent>
      </Card>
    </div>
  )
}

function DonationHistory({ donor }: { donor: DonorDetail }) {
  const me = useMe()
  const canViewCase = useCan(BloodBankPermission.CaseView)
  const sessionBranchId = me.data?.branch.id

  if (donor.donations.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No donations recorded yet</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Case</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Donated for</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Bag</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {donor.donations.map((donation) => {
            // Cases of other branches are forbidden, so they are not linked.
            const ownBranch = donation.case.branch_id === sessionBranchId
            const { patient } = donation
            return (
              <TableRow key={donation.case_donor_id} className="*:align-top">
                <TableCell>
                  <DateTime value={donationDate(donation)} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    {ownBranch && canViewCase ? (
                      <Link
                        href={`/blood-bank/cases/${donation.case.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {donation.case.case_no}
                      </Link>
                    ) : (
                      <span className="font-medium">
                        {donation.case.case_no}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {[
                        careTypeLabels[donation.case.care_type],
                        donation.case.transfusion_reason,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {ownBranch ? "This branch" : "Other branch"}
                </TableCell>
                <TableCell>
                  {patient ? (
                    <div className="flex flex-col">
                      <span>{patient.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {patient.patient_no}
                      </span>
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <DonationStatusBadge status={donation.status} />
                    {donation.status === CaseDonorStatus.Deferred &&
                    donation.deferral_reason ? (
                      <span className="text-xs text-muted-foreground">
                        {donation.deferral_reason}
                      </span>
                    ) : null}
                    {donation.sequence_no > 1 ? (
                      <span className="text-xs text-muted-foreground">
                        Replacement donor #{donation.sequence_no}
                      </span>
                    ) : null}
                    {donation.assessed_at ? (
                      <span className="text-xs text-muted-foreground">
                        Assessed <DateTime value={donation.assessed_at} />
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {donation.collections.map((collection) => (
                      <span key={collection.id} className="text-sm">
                        {collection.bag_no}
                        {collection.volume_ml !== null
                          ? ` · ${collection.volume_ml} ml`
                          : ""}
                        {collection.status === CollectionStatus.Cancelled ? (
                          <Badge variant="outline" className="ml-2">
                            Cancelled
                          </Badge>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
