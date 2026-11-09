import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CaseDonorStatusBadge } from "@/modules/blood-bank/case-donors/components/case-donor-status-badge"
import type { CaseDonor } from "@/modules/blood-bank/cases/types"
import { CaseDonorStatus } from "@/modules/blood-bank/enums"
import { bloodGroupLabels, genderLabels } from "@/modules/shared/patient/enums"
import { formatAge } from "@/modules/shared/patient/format"

/** The donors already on the case, in sequence order, with the bill each one is on. */
export function CaseDonorsTable({ donors }: { donors: CaseDonor[] }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Current donors</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Donor no</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Blood group</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invoice no</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {donors.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground"
                >
                  No donors.
                </TableCell>
              </TableRow>
            ) : (
              donors.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="tabular-nums">
                    {entry.sequence_no}
                  </TableCell>
                  <TableCell>{entry.donor.donor_no}</TableCell>
                  <TableCell>{entry.donor.name}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatAge(entry.donor.age) ?? "—"}
                  </TableCell>
                  <TableCell>
                    {entry.donor.gender
                      ? genderLabels[entry.donor.gender]
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {entry.donor.blood_group
                      ? bloodGroupLabels[entry.donor.blood_group]
                      : "—"}
                  </TableCell>
                  <TableCell>{entry.donor.phone ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <CaseDonorStatusBadge status={entry.status} />
                      {entry.status === CaseDonorStatus.Deferred &&
                      entry.deferral_reason ? (
                        <span className="max-w-64 text-xs whitespace-normal text-destructive">
                          {entry.deferral_reason}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {entry.invoice_no ?? (
                      <span className="text-muted-foreground">
                        Case invoice
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
