"use client"

import { PrinterIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type {
  Crossmatch,
  IssueUnit,
} from "@/modules/blood-bank/blood-issue/types"
import { crossmatchResultLabels } from "@/modules/blood-bank/enums"
import {
  UnitExpiry,
  UnitStatusBadge,
} from "@/modules/blood-bank/units/components/unit-status-badge"
import { storageText } from "@/modules/blood-bank/units/format"
import { bloodGroupLabels } from "@/modules/shared/patient/enums"

/**
 * The units reserved for or issued to the case, read-only. A checkbox (only while `can_issue`)
 * picks the units to issue; "Reprint" shows for units with a crossmatch.
 */
export function IssueUnitTable({
  units,
  selectedIds,
  onSelectedChange,
  showSelection,
  canPrint,
  onReprint,
}: {
  units: IssueUnit[]
  selectedIds: ReadonlySet<number>
  onSelectedChange: (unitId: number, selected: boolean) => void
  /** The user may issue: show the checkboxes. */
  showSelection: boolean
  canPrint: boolean
  onReprint: (unit: IssueUnit) => void
}) {
  const showReprint = canPrint && units.some((unit) => unit.crossmatch)
  const columns = 9 + (showSelection ? 1 : 0) + (showReprint ? 1 : 0)

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            {showSelection ? (
              <TableHead className="w-10">
                <span className="sr-only">Issue</span>
              </TableHead>
            ) : null}
            <TableHead>Unit no</TableHead>
            <TableHead>Component</TableHead>
            <TableHead>Blood group</TableHead>
            <TableHead>Expires at</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Bag / donor no</TableHead>
            <TableHead>Crossmatch</TableHead>
            <TableHead className="text-right">Report prints</TableHead>
            {showReprint ? (
              <TableHead>
                <span className="sr-only">Reprint</span>
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns}
                className="text-center text-muted-foreground"
              >
                No unit is reserved for this case yet (Component Preparation).
              </TableCell>
            </TableRow>
          ) : (
            units.map((unit) => (
              <TableRow
                key={unit.id}
                data-state={selectedIds.has(unit.id) ? "selected" : undefined}
              >
                {showSelection ? (
                  <TableCell>
                    <Checkbox
                      checked={unit.can_issue && selectedIds.has(unit.id)}
                      disabled={!unit.can_issue}
                      onCheckedChange={(checked) =>
                        onSelectedChange(unit.id, checked === true)
                      }
                      aria-label={`Issue ${unit.unit_no}`}
                    />
                  </TableCell>
                ) : null}
                <TableCell className="font-medium">{unit.unit_no}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{unit.component.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {unit.component.code}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {unit.blood_group ? bloodGroupLabels[unit.blood_group] : "—"}
                </TableCell>
                <TableCell>
                  <UnitExpiry expiresAt={unit.expires_at} />
                </TableCell>
                <TableCell>{storageText(unit)}</TableCell>
                <TableCell>
                  <UnitStatusBadge status={unit.status} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{unit.bag_no}</span>
                    <span className="text-xs text-muted-foreground">
                      {unit.donor_no}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {unit.crossmatch ? (
                    <CrossmatchCell crossmatch={unit.crossmatch} />
                  ) : (
                    <span className="text-muted-foreground">Not done</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {unit.compatibility_report_print_count}
                </TableCell>
                {showReprint ? (
                  <TableCell>
                    {unit.crossmatch ? (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => onReprint(unit)}
                        aria-label={`Reprint report ${unit.unit_no}`}
                      >
                        <PrinterIcon data-icon="inline-start" />
                        Reprint
                      </Button>
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function CrossmatchCell({ crossmatch }: { crossmatch: Crossmatch }) {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <Badge variant={crossmatch.is_compatible ? "secondary" : "destructive"}>
        {crossmatch.is_compatible ? "Compatible" : "Incompatible"}
        {crossmatch.version > 1 ? ` · v${crossmatch.version}` : null}
      </Badge>
      <span className="text-xs text-muted-foreground">
        Major {crossmatchResultLabels[crossmatch.major_result].toLowerCase()} ·
        Minor {crossmatchResultLabels[crossmatch.minor_result].toLowerCase()}
      </span>
      {crossmatch.tested_by ? (
        <span className="text-xs text-muted-foreground">
          {crossmatch.tested_by.name}
          {crossmatch.reviewed_by ? ` / ${crossmatch.reviewed_by.name}` : null}
        </span>
      ) : null}
    </div>
  )
}
