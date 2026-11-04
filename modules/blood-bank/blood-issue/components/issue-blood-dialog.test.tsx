import { QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { makeQueryClient } from "@/lib/query-client"
import { IssueTab } from "@/modules/blood-bank/blood-issue/components/issue-tab"
import { ReprintDialog } from "@/modules/blood-bank/blood-issue/components/reprint-dialog"
import { printCompatibilityReport } from "@/lib/print-service"
import {
  bloodIssueView,
  issueUnit,
} from "@/modules/blood-bank/blood-issue/test-fixtures"
import type { IssueBloodInput } from "@/modules/blood-bank/blood-issue/types"
import type { Me } from "@/modules/shared/auth/types"

vi.mock("@/lib/print-service", () => ({
  printCompatibilityReport: vi.fn(() => Promise.resolve()),
}))

const me: Me = {
  user: {
    id: 1,
    employee_id: "E1",
    name: "Desk",
    username: "desk",
    designation: null,
  },
  branch: { id: 1, code: "B1", name: "Branch" },
  permissions: [],
  is_super_admin: true,
  must_change_password: false,
}

const staff = [
  { id: 5, employee_id: "E005", name: "Tech Rahman", designation: "MT" },
  { id: 9, employee_id: "E009", name: "Dr Karim", designation: "Physician" },
]

let screenRequests = 0
let issued: IssueBloodInput | null = null

const server = setupServer(
  http.get("/api/auth/me", () => HttpResponse.json({ data: me })),
  http.get("/api/blood-bank/cases/1/blood-issue", () => {
    screenRequests += 1
    return HttpResponse.json({ data: bloodIssueView() })
  }),
  http.get("/api/staff/lookup", ({ request }) => {
    const search = new URL(request.url).searchParams.get("search") ?? ""
    return HttpResponse.json({
      data: staff.filter((person) =>
        `${person.employee_id} ${person.name}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    })
  }),
  http.post("/api/blood-bank/cases/1/blood-issue", async ({ request }) => {
    issued = (await request.json()) as IssueBloodInput
    return HttpResponse.arrayBuffer(
      new TextEncoder().encode("%PDF-1.7").buffer,
      {
        status: 201,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'inline; filename="CTR-BB-0001.pdf"',
        },
      }
    )
  })
)

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" })
  // jsdom lacks what cmdk and Radix use for layout and pointer handling.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= () => {}
  Element.prototype.hasPointerCapture ??= () => false
  Element.prototype.releasePointerCapture ??= () => {}
})
beforeEach(() => {
  screenRequests = 0
  issued = null
  vi.mocked(printCompatibilityReport).mockClear()
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderWithClient(ui: React.ReactElement) {
  const user = userEvent.setup()
  render(
    <QueryClientProvider client={makeQueryClient()}>{ui}</QueryClientProvider>
  )
  return user
}

async function openIssueDialog(
  user: UserEvent,
  { untick = [] as string[] } = {}
) {
  // The checkboxes and the button show once `/me` grants the permission.
  const button = await screen.findByRole("button", { name: /^Issue Blood/ })
  for (const unitNo of untick) {
    await user.click(
      await screen.findByRole("checkbox", { name: `Issue ${unitNo}` })
    )
  }
  await user.click(button)
  return screen.findByRole("dialog")
}

async function pickStaff(
  user: UserEvent,
  dialog: HTMLElement,
  field: RegExp,
  search: string,
  name: RegExp
) {
  await user.type(within(dialog).getByRole("combobox", { name: field }), search)
  await user.click(await screen.findByRole("option", { name }))
}

async function chooseAll(user: UserEvent, dialog: HTMLElement, label: string) {
  for (const radio of within(dialog).getAllByRole("radio", { name: label })) {
    await user.click(radio)
  }
}

describe("Issue Blood dialog", () => {
  it("asks for vitals only for donors that need them and whose units are selected", async () => {
    const user = renderWithClient(
      <IssueTab caseId={1} onCaseChange={() => {}} />
    )
    const dialog = await openIssueDialog(user, { untick: ["U-12"] })

    const blocks = within(dialog).getAllByRole("group", {
      name: /Post-donation vitals/,
    })
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toHaveAccessibleName(/D0001/)
    // Donor #3's vitals are recorded: shown, not asked for.
    expect(within(dialog).getByText(/Pulse 80 bpm · BP 118\/76/)).toBeVisible()
    expect(within(dialog).queryByText(/D0002/)).toBeNull()
  })

  it("disables submit while a unit is incompatible", async () => {
    const user = renderWithClient(
      <IssueTab caseId={1} onCaseChange={() => {}} />
    )
    const dialog = await openIssueDialog(user)
    const submit = within(dialog).getByRole("button", { name: "Issue blood" })

    expect(submit).toBeEnabled()
    const [majorIncompatible] = within(dialog).getAllByRole("radio", {
      name: "Incompatible",
    })
    await user.click(majorIncompatible as HTMLElement)
    expect(submit).toBeDisabled()
    expect(
      within(dialog).getByText(/U-11 is marked incompatible/)
    ).toBeVisible()

    const [majorCompatible] = within(dialog).getAllByRole("radio", {
      name: "Compatible",
    })
    await user.click(majorCompatible as HTMLElement)
    expect(submit).toBeEnabled()
  })

  it("on 201 prints the PDF, then refetches the screen", async () => {
    const user = renderWithClient(
      <IssueTab caseId={1} onCaseChange={() => {}} />
    )
    const dialog = await openIssueDialog(user, { untick: ["U-12", "U-13"] })

    await pickStaff(
      user,
      dialog,
      /^Medical technologist/,
      "Tech",
      /Tech Rahman/
    )
    await pickStaff(user, dialog, /^Physician/, "Karim", /Dr Karim/)
    await chooseAll(user, dialog, "Compatible")
    await user.type(within(dialog).getByLabelText(/Pulse/), "82")
    await user.type(within(dialog).getByLabelText(/BP systolic/), "118")
    await user.type(within(dialog).getByLabelText(/BP diastolic/), "78")
    await user.type(within(dialog).getByLabelText(/Temp/), "98.6")

    const requestsBefore = screenRequests
    await user.click(
      within(dialog).getByRole("button", { name: "Issue blood" })
    )

    await waitFor(() =>
      expect(printCompatibilityReport).toHaveBeenCalledTimes(1)
    )
    const [blob, filename] = vi.mocked(printCompatibilityReport).mock
      .calls[0] ?? [new Blob(), ""]
    expect(filename).toBe("CTR-BB-0001.pdf")
    expect(await blob.text()).toBe("%PDF-1.7")
    expect(issued).toEqual({
      technologist_id: 5,
      physician_id: 9,
      patient_blood_group: null,
      amendment_reason: null,
      units: [
        {
          unit_id: 11,
          major_result: "compatible",
          minor_result: "compatible",
          remarks: null,
        },
      ],
      post_donation: [
        {
          case_donor_id: 101,
          pulse_bpm: 82,
          bp_systolic: 118,
          bp_diastolic: 78,
          temperature_f: 98.6,
        },
      ],
    })
    await waitFor(() => expect(screenRequests).toBeGreaterThan(requestsBefore))
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
  })
})

describe("Reprint dialog", () => {
  it("requires a reason before calling the API", async () => {
    let requested = false
    server.use(
      http.post("/api/blood-bank/cases/1/compatibility-reports", () => {
        requested = true
        return new HttpResponse(null, { status: 500 })
      })
    )
    const unit = issueUnit(11, 1, {
      status: "issued",
      can_issue: false,
      compatibility_report_print_count: 1,
    })
    const user = renderWithClient(
      <ReprintDialog
        caseId={1}
        units={[unit]}
        initialUnitIds={[11]}
        open
        onOpenChange={() => {}}
        onPrinted={() => {}}
      />
    )

    await user.click(screen.getByRole("button", { name: "Reprint" }))
    expect(
      await screen.findByText("Enter a reason for the reprint.")
    ).toBeVisible()
    expect(requested).toBe(false)
  })
})
