/**
 * Mirrors the backend Blood Bank permission enum (`BloodBankPermission`).
 * Values must match `sh_permissions` exactly. Add entries as screens are built.
 */
export const BloodBankPermission = {
  CaseView: "bb.case.view",
  CaseCreate: "bb.case.create",
  DonorView: "bb.donor.view",
  SampleView: "bb.sample.view",
  SampleCollect: "bb.sample.collect",
  SampleLabelPrint: "bb.sample.print_label",
} as const

export type BloodBankPermission =
  (typeof BloodBankPermission)[keyof typeof BloodBankPermission]
