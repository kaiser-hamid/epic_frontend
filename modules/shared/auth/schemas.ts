import { z } from "zod"

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
  branch_id: z.number({ error: "Select a branch." }).int().positive(),
})

export type LoginValues = z.infer<typeof loginSchema>

/** Mirrors the backend `AccountRules`. */
export const PASSWORD_MIN = 10
export const PASSWORD_MAX = 64

export const passwordRuleHint = `${PASSWORD_MIN} to ${PASSWORD_MAX} characters: letters, numbers or both. No special characters.`

/**
 * Every new password (new user, admin reset, own change): letters only, digits only or both;
 * no special characters.
 */
export const newPassword = (emptyMessage: string) =>
  z
    .string()
    .min(1, emptyMessage)
    .min(PASSWORD_MIN, `At least ${PASSWORD_MIN} characters.`)
    .max(PASSWORD_MAX, `At most ${PASSWORD_MAX} characters.`)
    .regex(
      /^[A-Za-z0-9]+$/,
      "Use letters and numbers only, without special characters."
    )

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    password: newPassword("Enter a new password."),
    password_confirmation: z.string().min(1, "Repeat the new password."),
  })
  .refine((values) => values.password === values.password_confirmation, {
    path: ["password_confirmation"],
    error: "Passwords do not match.",
  })

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
