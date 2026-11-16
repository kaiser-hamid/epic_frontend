import { Fragment } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const valueWidths = ["w-28", "w-36", "w-24", "w-20", "w-32"]

/** Placeholder for a `PageHeader`: title, description line and `actions` button shapes (Tailwind widths). */
export function PageHeaderSkeleton({ actions = [] }: { actions?: string[] }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-56" />
      </div>
      {actions.length > 0 ? (
        <div className="flex items-center gap-2">
          {actions.map((width, index) => (
            <Skeleton key={index} className={cn("h-9", width)} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** Placeholder for a label/value card: the real title and labels, a bar for each value. */
export function DetailCardSkeleton({
  title,
  labels,
}: {
  title: string
  labels: string[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-2 text-sm">
          {labels.map((label, index) => (
            <Fragment key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd>
                <Skeleton
                  className={cn("h-4", valueWidths[index % valueWidths.length])}
                />
              </dd>
            </Fragment>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
