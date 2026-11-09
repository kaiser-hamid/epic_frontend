/**
 * Mirrors the backend Blood Bank permission enum (`BloodBankPermission`).
 * Values must match `sh_permissions` exactly. Add entries as screens are built.
 */
export const BloodBankPermission = {
  CaseView: "bb.case.view",
  CaseUpdate: "bb.case.update",
  DonorView: "bb.donor.view",
  DonorExamView: "bb.donor_exam.view",
  DonorExamRecord: "bb.donor_exam.record",
  SerologyView: "bb.serology.view",
  SerologyRecord: "bb.serology.record",
  SampleView: "bb.sample.view",
  SampleCollect: "bb.sample.collect",
  SampleLabelPrint: "bb.sample.print_label",
  CollectionView: "bb.collection.view",
  CollectionCollect: "bb.collection.collect",
  CollectionLabelPrint: "bb.collection.print_label",
  UnitView: "bb.unit.view",
  UnitPrepare: "bb.unit.prepare",
  UnitLabelPrint: "bb.unit.print_label",
  IssueView: "bb.issue.view",
  IssueRecord: "bb.issue.record",
  IssueReportPrint: "bb.issue.print_report",
} as const

export type BloodBankPermission =
  (typeof BloodBankPermission)[keyof typeof BloodBankPermission]
