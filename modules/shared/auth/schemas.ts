import { z } from "zod"

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username."),
  password: z.string().min(1, "Enter your password."),
  branch_id: z.number({ error: "Select a branch." }).int().positive(),
})

export type LoginValues = z.infer<typeof loginSchema>

/** Strength rules live in the backend (`Password::default()`); only shape is checked here. */
export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password."),
    password: z.string().min(1, "Enter a new password."),
    password_confirmation: z.string().min(1, "Repeat the new password."),
  })
  .refine((values) => values.password === values.password_confirmation, {
    path: ["password_confirmation"],
    error: "Passwords do not match.",
  })

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>
