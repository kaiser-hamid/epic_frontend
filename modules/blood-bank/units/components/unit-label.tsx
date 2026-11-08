import { Barcode } from "@/components/barcode"
import { formatShortDateTime } from "@/lib/format"
import { anyScreeningResultLabels } from "@/modules/blood-bank/enums"
import type { UnitLabel } from "@/modules/blood-bank/units/types"
import { bloodGroupLabels } from "@/modules/shared/patient/enums"

/**
 * Component label stock size. Not confirmed yet: change it here only. Every label is one
 * printed page of this size.
 */
const LABEL_WIDTH_MM = 100
const LABEL_HEIGHT_MM = 70

/** Print stylesheet for the label sheet (react-to-print `pageStyle`). */
export const unitLabelPageStyle = `
  @page { size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  [data-unit-label] {
    box-sizing: border-box;
    width: ${LABEL_WIDTH_MM}mm;
    height: ${LABEL_HEIGHT_MM}mm;
    color: #000;
    break-after: page;
    page-break-after: always;
  }
  [data-unit-label]:last-child { break-after: auto; page-break-after: auto; }
`

function Line({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-[1mm]">
      <span className="shrink-0">{label}:</span>
      <span className="min-w-0 truncate">{value}</span>
    </div>
  )
}

/**
 * One component label: a large Code128 barcode of the unit no, the component, a big blood
 * group, the volume and dates (expiry in bold), storage condition, bag and donor no, the
 * donor's screening results, who the unit is reserved for, and "REPRINT" on a reprint.
 */
export function UnitLabelCard({ label }: { label: UnitLabel }) {
  const { component, reserved_for: reservedFor } = label

  return (
    <div
      data-unit-label
      className="flex flex-col gap-[1.5mm] overflow-hidden px-[3mm] py-[2.5mm] font-sans text-[7pt] leading-tight"
    >
      <div className="flex items-start gap-[2mm]">
        <div className="flex min-w-0 flex-1 flex-col items-center">
          <Barcode value={label.unit_no} className="h-[13mm] w-full" />
          <div className="font-mono text-[11pt] font-bold tracking-wider">
            {label.unit_no}
          </div>
        </div>
        {label.label_print.is_reprint ? (
          <div className="shrink-0 border border-current px-[1mm] text-[8pt] font-bold">
            REPRINT
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-[3mm]">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[10pt] font-bold">
            {component.name} ({component.code})
          </div>
          <div>{label.volume_ml === null ? "—" : `${label.volume_ml} ml`}</div>
          {component.storage_condition ? (
            <div>Store at {component.storage_condition}</div>
          ) : null}
        </div>
        <div className="shrink-0 border-2 border-current px-[2mm] text-[22pt] leading-none font-bold">
          {label.blood_group ? bloodGroupLabels[label.blood_group] : "—"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-[3mm]">
        <div>
          <Line
            label="Collected"
            value={formatShortDateTime(label.collected_at)}
          />
          <Line
            label="Prepared"
            value={formatShortDateTime(label.prepared_at)}
          />
          <div className="font-bold">
            <Line
              label="Expires"
              value={formatShortDateTime(label.expires_at)}
            />
          </div>
        </div>
        <div>
          <Line label="Bag" value={label.bag_no} />
          <Line label="Donor" value={label.donor_no} />
        </div>
      </div>

      {label.screening.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-[3mm] border-t border-current pt-[1mm]">
          {label.screening.map((test) => (
            <Line
              key={test.code}
              label={test.name}
              value={
                <span className="font-semibold">
                  {test.result ? anyScreeningResultLabels[test.result] : "—"}
                </span>
              }
            />
          ))}
        </div>
      ) : null}

      {reservedFor ? (
        <div className="mt-auto truncate border-t border-current pt-[1mm] font-bold">
          Reserved for: {reservedFor.patient_name ?? "—"} (
          {reservedFor.patient_no ?? "—"}), Case {reservedFor.case_no}
        </div>
      ) : null}
    </div>
  )
}
