/**
 * Mirrors the backend Blood Bank permission enum (`BloodBankPermission`).
 * Values must match `sh_permissions` exactly. Add entries as screens are built.
 */
export const BloodBankPermission = {
  CaseView: "bb.case.view",
  CaseCreate: "bb.case.create",
  DonorView: "bb.donor.view",
  DonorExamView: "bb.donor_exam.view",
  DonorExamRecord: "bb.donor_exam.record",
  SerologyView: "bb.serology.view",
  SerologyRecord: "bb.serology.record",
  SampleView: "bb.sample.view",
  SampleCollect: "bb.sample.collect",
  SampleLabelPrint: "bb.sample.print_label",
} as const

export type BloodBankPermission =
  (typeof BloodBankPermission)[keyof typeof BloodBankPermission]
