import { DateTime } from "@/components/date-time"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  ageGenderText,
  donorTitle,
  vitalsText,
} from "@/modules/blood-bank/blood-issue/format"
import type {
  IssueComponent,
  IssueDonor,
  IssuePatientSample,
} from "@/modules/blood-bank/blood-issue/types"
import { CaseDonorStatusBadge } from "@/modules/blood-bank/case-donors/components/case-donor-status-badge"
import {
  screeningTestLabels,
  screeningTests,
} from "@/modules/blood-bank/donor-serology/types"
import {
  CaseDonorStatus,
  ScreeningResult,
  screeningResultLabels,
} from "@/modules/blood-bank/enums"
import { SampleStatusBadge } from "@/modules/blood-bank/samples/components/sample-status-badge"
import { bloodGroupLabels } from "@/modules/shared/patient/enums"

/** Billed components: billed, reserved, issued and still to issue. */
export function ComponentsCard({
  components,
}: {
  components: IssueComponent[]
}) {
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardTitle>Components</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Component</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Issued</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {components.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    No component was billed.
                  </TableCell>
                </TableRow>
              ) : (
                components.map((component) => (
                  <TableRow key={component.component_type_id}>
                    <TableCell>
                      <span className="font-medium">{component.code}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {component.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {component.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {component.reserved_count}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {component.issued_count}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        component.remaining_count === 0 &&
                          "text-muted-foreground"
                      )}
                    >
                      {component.remaining_count}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

/** The patient sample the crossmatch is done on, and its current blood group. */
export function PatientSampleCard({
  sample,
}: {
  sample: IssuePatientSample | null
}) {
  const group = sample?.blood_group

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Patient sample
          {sample ? <SampleStatusBadge status={sample.status} /> : null}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sample ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
            <Info label="Sample no" value={sample.sample_no} />
            <Info
              label="Collected at"
              value={<DateTime value={sample.collected_at} />}
            />
            <Info
              label="Blood group"
              value={
                group ? (
                  <span className="text-base">
                    {bloodGroupLabels[group.value]}
                    {group.version > 1 ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        {" "}
                        (amended, v{group.version})
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not entered</span>
                )
              }
            />
            <Info
              label="Grouped by"
              value={
                group ? (
                  <span className="flex flex-col">
                    <span>{group.tested_by?.name ?? "—"}</span>
                    <DateTime
                      value={group.tested_at}
                      className="text-xs font-normal text-muted-foreground"
                    />
                  </span>
                ) : undefined
              }
            />
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            Not collected yet. Collect the patient sample first (Sample
            Collection).
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/** One card per case donor: decision, examination vitals, serology and bag. */
export function DonorCards({ donors }: { donors: IssueDonor[] }) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="issue_donors">
      <h2 id="issue_donors" className="text-sm font-medium">
        Donors
      </h2>
      {donors.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No donor is registered for this case.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {donors.map((donor) => (
            <DonorCard
              key={donor.case_donor_id ?? donor.number ?? donor.sequence_no}
              donor={donor}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function DonorCard({ donor }: { donor: IssueDonor }) {
  const { examination, serology, bag } = donor
  const deferred = donor.case_donor_status === CaseDonorStatus.Deferred

  return (
    <Card size="sm" className={cn("min-w-0", deferred && "opacity-75")}>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {donorTitle(donor)}
          {donor.case_donor_status ? (
            <CaseDonorStatusBadge status={donor.case_donor_status} />
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          <Info label="Age / gender" value={ageGenderText(donor)} />
          <Info
            label="Blood group"
            value={
              donor.blood_group
                ? bloodGroupLabels[donor.blood_group]
                : undefined
            }
          />
          <Info label="Phone" value={donor.phone} />
          <Info label="Donor invoice no" value={donor.invoice_no} />
          <Info
            label="Decided"
            value={
              donor.assessed_at ? (
                <span className="flex flex-col">
                  <DateTime value={donor.assessed_at} />
                  {donor.assessed_by ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      {donor.assessed_by.name}
                    </span>
                  ) : null}
                </span>
              ) : undefined
            }
          />
          {donor.deferral_reason ? (
            <Info
              label="Deferral reason"
              value={
                <span className="text-destructive">
                  {donor.deferral_reason}
                </span>
              }
              className="col-span-2 sm:col-span-3"
              wrap
            />
          ) : null}
        </dl>

        <Section title="Physical examination">
          {examination ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Info label="Weight" value={`${examination.weight_kg} kg`} />
              <Info
                label="Hemoglobin"
                value={`${examination.hemoglobin_g_dl} g/dL`}
              />
              <Info
                label="Examined"
                value={
                  <span className="flex flex-col">
                    <DateTime value={examination.examined_at} />
                    {examination.examined_by ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        {examination.examined_by.name}
                      </span>
                    ) : null}
                  </span>
                }
              />
              <Info
                label="Pre-donation"
                value={vitalsText(examination.pre)}
                className="col-span-2 sm:col-span-3"
                wrap
              />
              <Info
                label="Post-donation"
                className="col-span-2 sm:col-span-3"
                wrap
                value={
                  examination.post ? (
                    <span className="flex flex-col">
                      <span>{vitalsText(examination.post)}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        <DateTime value={examination.post.recorded_at} />
                        {examination.post.recorded_by
                          ? ` · ${examination.post.recorded_by.name}`
                          : null}
                      </span>
                    </span>
                  ) : (
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">
                        Not recorded
                      </span>
                      {donor.needs_post_vitals ? (
                        <Badge variant="outline">Entered on issue</Badge>
                      ) : null}
                    </span>
                  )
                }
              />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Not examined.</p>
          )}
        </Section>

        <Section title="Serology">
          {serology ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Info label="Sample no" value={serology.sample_no} />
              <Info
                label="Blood group"
                value={
                  serology.blood_group
                    ? bloodGroupLabels[serology.blood_group]
                    : undefined
                }
              />
              <Info
                label="Tested"
                value={
                  <span className="flex flex-col">
                    <DateTime value={serology.tested_at} />
                    {serology.tested_by ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        {serology.tested_by.name}
                      </span>
                    ) : null}
                  </span>
                }
              />
              {screeningTests.map((test) => {
                const result = serology[test]
                return (
                  <Info
                    key={test}
                    label={screeningTestLabels[test]}
                    value={
                      result ? (
                        <span
                          className={cn(
                            result === ScreeningResult.Reactive &&
                              "text-destructive"
                          )}
                        >
                          {screeningResultLabels[result]}
                        </span>
                      ) : undefined
                    }
                  />
                )
              })}
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Not tested.</p>
          )}
        </Section>

        <Section title="Bag">
          {bag ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Info label="Bag no" value={bag.bag_no} />
              <Info label="Volume" value={`${bag.volume_ml} ml`} />
              <Info
                label="Collected"
                value={
                  <span className="flex flex-col">
                    <DateTime value={bag.collected_at} />
                    {bag.collected_by ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        {bag.collected_by.name}
                      </span>
                    ) : null}
                  </span>
                }
              />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Not collected.</p>
          )}
        </Section>
      </CardContent>
    </Card>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </div>
  )
}

function Info({
  label,
  value,
  className,
  wrap = false,
}: {
  label: string
  value: React.ReactNode
  className?: string
  /** Let long text wrap instead of truncating. */
  wrap?: boolean
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("font-medium", !wrap && "truncate")}>{value ?? "—"}</dd>
    </div>
  )
}
