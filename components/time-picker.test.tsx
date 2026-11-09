import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { TimePicker } from "@/components/time-picker"

function renderTimePicker(initial: string) {
  const onChange = vi.fn()
  function Harness() {
    const [value, setValue] = useState(initial)
    return (
      <TimePicker
        value={value}
        onChange={(next) => {
          setValue(next)
          onChange(next)
        }}
      />
    )
  }
  render(<Harness />)
  return onChange
}

describe("TimePicker", () => {
  it("keeps 24-hour HH:mm while the user picks 12-hour hour, minute and AM/PM", async () => {
    const user = userEvent.setup()
    const onChange = renderTimePicker("09:30")

    await user.click(screen.getByRole("button", { name: "Time 9:30 AM" }))
    const hours = screen.getByRole("group", { name: "Hour" })
    const periods = screen.getByRole("group", { name: "AM or PM" })

    await user.click(within(hours).getByRole("button", { name: "07" }))
    await user.click(within(periods).getByRole("button", { name: "PM" }))
    await user.click(within(hours).getByRole("button", { name: "12" }))
    await user.click(within(periods).getByRole("button", { name: "AM" }))

    expect(onChange.mock.calls.map(([value]) => value)).toEqual([
      "07:30",
      "19:30",
      "12:30",
      "00:30",
    ])
  })
})
