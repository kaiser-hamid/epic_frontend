/**
 * Mirrors the backend Shared permission enum (`Modules\Shared\Rbac\Enums\SharedPermission`).
 * Values must match `sh_permissions` exactly.
 */
export const SharedPermission = {
  UserView: "sh.user.view",
  UserCreate: "sh.user.create",
  UserUpdate: "sh.user.update",
  UserDeactivate: "sh.user.deactivate",
  UserResetPassword: "sh.user.reset_password",
  UserUnlock: "sh.user.unlock",
  UserForceLogout: "sh.user.force_logout",
  UserAssignPermissions: "sh.user.assign_permissions",
  RoleView: "sh.role.view",
  RoleManage: "sh.role.manage",
  PatientView: "sh.patient.view",
  PatientCreate: "sh.patient.create",
  BillingView: "sh.billing.view",
  BillingCreate: "sh.billing.create",
} as const

export type SharedPermission =
  (typeof SharedPermission)[keyof typeof SharedPermission]
