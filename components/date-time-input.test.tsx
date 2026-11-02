import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { DateTimeInput, normalizeTime } from "@/components/date-time-input"

function renderDateTimeInput(initial = "") {
  const onChange = vi.fn()
  function Harness() {
    const [value, setValue] = useState(initial)
    return (
      <DateTimeInput
        id="collected_at"
        value={value}
        onChange={(next) => {
          setValue(next)
          onChange(next)
        }}
        max={new Date(2026, 10, 2)}
        defaultTime={() => "10:45"}
      />
    )
  }
  render(<Harness />)
  return { onChange, user: userEvent.setup() }
}

describe("DateTimeInput", () => {
  it("fills the default time when a date is picked from the calendar", async () => {
    const { onChange, user } = renderDateTimeInput()

    await user.click(screen.getByPlaceholderText("DD/MM/YYYY"))
    await user.click(
      screen.getByRole("button", { name: /November 1st, 2026/i })
    )
    expect(onChange).toHaveBeenLastCalledWith("2026-11-01T10:45")
    expect(screen.getByRole("textbox", { name: "Time" })).toHaveValue("10:45")
  })

  it("joins a typed date and time, normalising the time on blur", async () => {
    const { onChange, user } = renderDateTimeInput("2026-11-01T10:45")
    const time = screen.getByRole("textbox", { name: "Time" })

    await user.clear(time)
    await user.type(time, "930")
    await user.tab()
    expect(onChange).toHaveBeenLastCalledWith("2026-11-01T09:30")
  })

  it("is empty when both parts are cleared", async () => {
    const { onChange, user } = renderDateTimeInput("2026-11-01T10:45")

    await user.clear(screen.getByPlaceholderText("DD/MM/YYYY"))
    await user.clear(screen.getByRole("textbox", { name: "Time" }))
    expect(onChange).toHaveBeenLastCalledWith("")
  })
})

describe("normalizeTime", () => {
  it("reads short forms and keeps what is not a time", () => {
    expect(normalizeTime("930")).toBe("09:30")
    expect(normalizeTime("9:30")).toBe("09:30")
    expect(normalizeTime("2359")).toBe("23:59")
    expect(normalizeTime("2460")).toBe("2460")
    expect(normalizeTime("9")).toBe("9")
  })
})
