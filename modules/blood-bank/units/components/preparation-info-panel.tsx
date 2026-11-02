import { DateTime } from "@/components/date-time"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { CaseStatusBadge } from "@/modules/blood-bank/cases/components/case-status-badge"
import { careTypeLabels } from "@/modules/blood-bank/enums"
import { componentHeldText } from "@/modules/blood-bank/units/format"
import type { ComponentPreparation } from "@/modules/blood-bank/units/types"
import {
  bloodGroupLabels,
  genderLabels,
  type Gender,
} from "@/modules/shared/patient/enums"

function ageGender(person: {
  age: number | null
  gender: Gender | null
}): string | undefined {
  return (
    [
      person.age === null ? null : `${person.age}y`,
      person.gender ? genderLabels[person.gender] : null,
    ]
      .filter(Boolean)
      .join(" · ") || undefined
  )
}

/**
 * The bag (volume, when and by whom it was collected), its donor, the case's patient, and the
 * case with each requested component's requested and held counts.
 */
export function PreparationInfoPanel({
  view,
  isLoading,
}: {
  view: ComponentPreparation | undefined
  isLoading: boolean
}) {
  const bag = view?.bag
  const donor = bag?.donor
  const patient = bag?.patient
  const record = view?.case

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Bag information
          {record ? <CaseStatusBadge status={record.status} /> : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 2xl:grid-cols-4">
            <Info label="Bag no" value={bag?.bag_no} />
            <Info
              label="Volume"
              value={bag ? `${bag.volume_ml} ml` : undefined}
            />
            <Info
              label="Collected at"
              value={bag ? <DateTime value={bag.collected_at} /> : undefined}
            />
            <Info label="Collected by" value={bag?.collected_by.name} />

            <Info label="Donor no" value={donor?.donor_no} />
            <Info label="Donor name" value={donor?.name} />
            <Info
              label="Donor age / gender"
              value={donor ? ageGender(donor) : undefined}
            />
            <Info
              label="Donor blood group"
              value={
                donor?.blood_group
                  ? bloodGroupLabels[donor.blood_group]
                  : undefined
              }
            />

            <Info label="Patient no" value={patient?.patient_no} />
            <Info label="Patient name" value={patient?.name} />
            <Info
              label="Patient age / gender"
              value={patient ? ageGender(patient) : undefined}
            />
            <Info label="Case no" value={record?.case_no} />
            <Info
              label="Care of"
              value={record ? careTypeLabels[record.care_type] : undefined}
            />
            <Info
              label="Components billed"
              className="col-span-2 md:col-span-3"
              value={
                record && record.components.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {record.components.map((component) => (
                      <Badge
                        key={component.component_type_id}
                        variant={
                          component.needed_count === 0 ? "secondary" : "outline"
                        }
                      >
                        {componentHeldText(component)}
                      </Badge>
                    ))}
                  </span>
                ) : undefined
              }
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
