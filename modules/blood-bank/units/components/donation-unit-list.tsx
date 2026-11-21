import type { DonationUnit } from "@/modules/blood-bank/units/types"

/**
 * The units of a donation, one per line ("BC2611210001 · PCV"): the numbers printed on the
 * labels. A donation has no number of its own. "—" when it has none.
 */
export function DonationUnitList({
  units,
}: {
  units: readonly DonationUnit[]
}) {
  if (units.length === 0) {
    return <>—</>
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {units.map((unit) => (
        <li key={unit.id} className="font-medium whitespace-nowrap">
          {unit.unit_no}
          <span className="font-normal text-muted-foreground">
            {" "}
            · {unit.component_code}
          </span>
        </li>
      ))}
    </ul>
  )
}
