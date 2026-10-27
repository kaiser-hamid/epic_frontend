import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { Form } from "@/components/form"

function renderForm({ submitDisabled = false } = {}) {
  const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault())
  render(
    <Form onSubmit={onSubmit}>
      <input aria-label="first" />
      <textarea aria-label="note" />
      <input aria-label="disabled" disabled />
      <input aria-label="last" />
      <button type="submit" disabled={submitDisabled}>
        Save
      </button>
    </Form>
  )
  return { onSubmit, user: userEvent.setup() }
}

describe("Form Enter key", () => {
  it("moves to the next field, keeps new lines in textareas, skips disabled fields", async () => {
    const { onSubmit, user } = renderForm()

    await user.type(screen.getByLabelText("first"), "a{Enter}")
    expect(screen.getByLabelText("note")).toHaveFocus()

    await user.keyboard("line 1{Enter}line 2")
    expect(screen.getByLabelText("note")).toHaveValue("line 1\nline 2")

    await user.tab()
    expect(screen.getByLabelText("last")).toHaveFocus()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("submits only from the last field", async () => {
    const { onSubmit, user } = renderForm()

    await user.type(screen.getByLabelText("last"), "x{Enter}")
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("does not submit while the submit button is disabled", async () => {
    const { onSubmit, user } = renderForm({ submitDisabled: true })

    await user.type(screen.getByLabelText("last"), "x{Enter}")
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
