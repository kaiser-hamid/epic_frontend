/**
 * Mirrors the backend Blood Bank permission enum (`PermissionDefinition`).
 * Values must match `sh_permissions` exactly. Add entries as screens are built.
 */
export const BloodBankPermission = {
  CaseView: "bb.case.view",
  CaseCreate: "bb.case.create",
  CaseUpdate: "bb.case.update",
  CaseCancel: "bb.case.cancel",
  UnitView: "bb.unit.view",
} as const

export type BloodBankPermission =
  (typeof BloodBankPermission)[keyof typeof BloodBankPermission]
