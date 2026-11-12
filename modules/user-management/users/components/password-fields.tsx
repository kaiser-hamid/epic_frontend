"use client"

import { TextControl } from "@/components/form-controls"

/** Password + repeat for an admin-set password (new user, reset). Needs `password` and `password_confirmation` in the form. */
export function PasswordFields({ label = "Password" }: { label?: string }) {
  return (
    <>
      <TextControl name="password" label={label} type="password" required />
      <TextControl
        name="password_confirmation"
        label="Repeat password"
        type="password"
        required
      />
    </>
  )
}
