import { Barcode } from "@/components/barcode"
import { formatShortDateTime } from "@/lib/format"
import type { BagLabel } from "@/modules/blood-bank/blood-collections/types"
import {
  bloodGroupLabels,
  genderLabels,
  type BloodGroup,
  type Gender,
} from "@/modules/shared/patient/enums"

/**
 * Bag label stock size. Not confirmed yet: change it here only. Every label is one printed
 * page of this size.
 */
const LABEL_WIDTH_MM = 100
const LABEL_HEIGHT_MM = 50

/** Print stylesheet for the label sheet (react-to-print `pageStyle`). */
export const bagLabelPageStyle = `
  @page { size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  [data-bag-label] {
    box-sizing: border-box;
    width: ${LABEL_WIDTH_MM}mm;
    height: ${LABEL_HEIGHT_MM}mm;
    color: #000;
    break-after: page;
    page-break-after: always;
  }
  [data-bag-label]:last-child { break-after: auto; page-break-after: auto; }
`

/** "30Y / Male / B+", leaving out what is unknown. */
function personLine(person: {
  age: number | null
  gender: Gender | null
  blood_group: BloodGroup | null
}): string {
  return (
    [
      person.age === null ? null : `${person.age}Y`,
      person.gender ? genderLabels[person.gender] : null,
      person.blood_group ? bloodGroupLabels[person.blood_group] : null,
    ]
      .filter(Boolean)
      .join(" / ") || "—"
  )
}

/**
 * One bag label: Code128 barcodes of the bag no (largest), donor no and case no; the donor
 * and patient; the volume, when and by whom it was collected; "REPRINT" on a reprint.
 */
export function BagLabelCard({ label }: { label: BagLabel }) {
  const { donor, patient } = label

  return (
    <div
      data-bag-label
      className="flex flex-col gap-[1mm] overflow-hidden px-[3mm] py-[2mm] font-sans text-[7pt] leading-tight"
    >
      <div className="flex items-start gap-[2mm]">
        <div className="flex min-w-0 flex-1 flex-col items-center">
          <Barcode value={label.bag_no} className="h-[11mm] w-full" />
          <div className="font-mono text-[11pt] font-bold tracking-wider">
            {label.bag_no}
          </div>
        </div>
        {label.label_print.is_reprint ? (
          <div className="shrink-0 border border-current px-[1mm] text-[8pt] font-bold">
            REPRINT
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-[3mm]">
        <div className="min-w-0">
          <div className="font-bold">Donor</div>
          <div className="truncate font-semibold">{donor.name}</div>
          <div>{personLine(donor)}</div>
        </div>
        <div className="min-w-0">
          <div className="font-bold">Patient</div>
          {patient ? (
            <>
              <div className="truncate font-semibold">
                {patient.patient_no} · {patient.name}
              </div>
              <div>{personLine(patient)}</div>
            </>
          ) : (
            <div>—</div>
          )}
        </div>
      </div>

      <div className="flex justify-between gap-[2mm]">
        <span className="font-semibold">{label.volume_ml} ml</span>
        <span>{formatShortDateTime(label.collected_at)}</span>
        <span className="truncate">{label.collected_by.name}</span>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-[3mm]">
        <div className="flex flex-col items-center">
          <Barcode value={donor.donor_no} className="h-[6mm] w-full" />
          <div className="font-mono">{donor.donor_no}</div>
        </div>
        <div className="flex flex-col items-center">
          <Barcode value={label.case.case_no} className="h-[6mm] w-full" />
          <div className="font-mono">{label.case.case_no}</div>
        </div>
      </div>
    </div>
  )
}
