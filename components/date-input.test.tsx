import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { DateInput } from "@/components/date-input"

function renderDateInput(initial = "") {
  const onChange = vi.fn()
  function Harness() {
    const [value, setValue] = useState(initial)
    return (
      <DateInput
        id="dob"
        value={value}
        onChange={(next) => {
          setValue(next)
          onChange(next)
        }}
        max={new Date(2026, 9, 29)}
      />
    )
  }
  render(<Harness />)
  return { onChange, user: userEvent.setup() }
}

describe("DateInput", () => {
  it("opens the calendar on a click in the field, keeping focus there", async () => {
    const { user } = renderDateInput()

    await user.click(screen.getByRole("textbox"))
    expect(screen.getByRole("grid")).toBeInTheDocument()
    expect(screen.getByRole("textbox")).toHaveFocus()
  })

  it("stays open on a year change and picks a day in that year", async () => {
    const { onChange, user } = renderDateInput("2020-03-15")

    await user.click(screen.getByRole("textbox"))
    await user.selectOptions(
      screen.getByRole("combobox", { name: /year/i }),
      "1986"
    )
    expect(screen.getByRole("grid")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /18th.*1986/i }))
    expect(onChange).toHaveBeenLastCalledWith("1986-03-18")
    expect(screen.getByRole("textbox")).toHaveValue("18/03/1986")
  })

  it("turns typed dd/MM/yyyy into the API date", async () => {
    const { onChange, user } = renderDateInput()

    await user.type(screen.getByRole("textbox"), "18081986")
    expect(onChange).toHaveBeenLastCalledWith("1986-08-18")
  })
})
