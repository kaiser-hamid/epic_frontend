import { expect, test } from "@playwright/test"

test("unauthenticated visit redirects to login and keeps the target", async ({
  page,
}) => {
  await page.goto("/blood-bank/cases")

  await expect(page).toHaveURL(/\/login\?next=%2Fblood-bank%2Fcases/)
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
})
