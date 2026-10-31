import { Barcode } from "@/components/barcode"
import { formatDateTime } from "@/lib/format"
import { subjectLabel } from "@/modules/blood-bank/samples/format"
import type { SampleLabel } from "@/modules/blood-bank/samples/types"
import { genderLabels } from "@/modules/shared/patient/enums"

/**
 * Label stock size. Not confirmed yet: change it here only. Every label is one printed
 * page of this size.
 */
const LABEL_WIDTH_MM = 50
const LABEL_HEIGHT_MM = 25

/** Print stylesheet for the label sheet (react-to-print `pageStyle`). */
export const sampleLabelPageStyle = `
  @page { size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  [data-sample-label] {
    box-sizing: border-box;
    width: ${LABEL_WIDTH_MM}mm;
    height: ${LABEL_HEIGHT_MM}mm;
    color: #000;
    break-after: page;
    page-break-after: always;
  }
  [data-sample-label]:last-child { break-after: auto; page-break-after: auto; }
`

/**
 * One sample label: Code128 barcode of the sample no, the sample no, name, age/gender, case
 * no, "Patient" or "Donor #n", and when it was collected.
 */
export function SampleLabelCard({ label }: { label: SampleLabel }) {
  const { subject } = label
  const ageGender = [
    subject.age === null ? null : `${subject.age}Y`,
    subject.gender ? genderLabels[subject.gender] : null,
  ]
    .filter(Boolean)
    .join(" / ")

  return (
    <div
      data-sample-label
      className="flex flex-col justify-between overflow-hidden px-[2mm] py-[1.5mm] font-sans text-[7pt] leading-tight"
    >
      <div className="flex items-baseline justify-between gap-[1mm] font-semibold">
        <span className="truncate">{subject.name ?? "—"}</span>
        <span className="shrink-0">{ageGender}</span>
      </div>
      <Barcode value={label.sample_no} className="h-[8mm] w-full" />
      <div className="text-center font-mono text-[8pt] font-bold tracking-wider">
        {label.sample_no}
      </div>
      <div className="flex justify-between gap-[1mm]">
        <span>{label.case.case_no}</span>
        <span className="font-semibold">{subjectLabel(subject)}</span>
      </div>
      <div>{formatDateTime(label.collected_at)}</div>
    </div>
  )
}
