import { describe, expect, it } from "vitest"

import {
  createUserSchema,
  mobilePhone,
  resetPasswordSchema,
} from "@/modules/shared/users/schemas"

function reset(password: string) {
  return resetPasswordSchema.safeParse({
    password,
    password_confirmation: password,
  })
}

describe("admin-set passwords", () => {
  it.each(["abcdefghij", "1234567890", "Abc1234567"])(
    "accepts letters, digits or both: %s",
    (password) => {
      expect(reset(password).success).toBe(true)
    }
  )

  it.each(["Abc12345!@", "pass word12", "Pässwort123"])(
    "rejects special characters: %s",
    (password) => {
      expect(reset(password).success).toBe(false)
    }
  )

  it("rejects passwords shorter than 10 characters", () => {
    expect(reset("abc123").success).toBe(false)
  })
})

describe("mobile phone", () => {
  it.each(["", "01712345678"])("accepts %j", (phone) => {
    expect(mobilePhone.safeParse(phone).success).toBe(true)
  })

  it.each(["0171234567", "017123456789", "02712345678", "+8801712345678"])(
    "rejects %s",
    (phone) => {
      expect(mobilePhone.safeParse(phone).success).toBe(false)
    }
  )
})

it("does not send an employee id: the backend generates it", () => {
  const parsed = createUserSchema.parse({
    name: "Rina",
    username: "rina",
    designation: "cashier",
    phone: "",
    password: "1234567890",
    password_confirmation: "1234567890",
    employee_id: "E9999999",
  })
  expect(parsed).not.toHaveProperty("employee_id")
})
