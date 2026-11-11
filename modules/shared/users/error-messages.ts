/** Text for account-administration error codes. Keys must match the backend `errorCode()` values. */
export const userErrorMessages: Partial<Record<string, string>> = {
  SUPER_ADMIN_PROTECTED: "Only a super admin can change a super admin account.",
  CANNOT_CHANGE_OWN_ACCOUNT:
    "You cannot change the status, password or permissions of your own account.",
}
