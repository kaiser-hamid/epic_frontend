import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useLookupTerm } from "@/hooks/use-lookup-term"

describe("useLookupTerm", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("searches only from 3 characters, after the typing pauses", () => {
    const { result } = renderHook(() => useLookupTerm())

    act(() => result.current.setTerm("Za"))
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current).toMatchObject({ search: "", tooShort: true })

    act(() => result.current.setTerm(" Zah "))
    expect(result.current).toMatchObject({ search: "", waiting: true })

    act(() => vi.advanceTimersByTime(300))
    expect(result.current).toMatchObject({ search: "Zah", waiting: false })
  })
})
