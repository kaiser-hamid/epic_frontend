import { describe, expect, it } from "vitest"

import {
  buildGrantModules,
  fullyTickedRoleIds,
  modulesForBranch,
  offeredNames,
  sectionState,
  toggleSection,
  type GrantSection,
} from "@/modules/user-management/permissions/grant-sections"
import type {
  PermissionCatalogEntry,
  RoleTemplate,
} from "@/modules/user-management/users/types"

function entry(
  name: string,
  module: string,
  module_label: string
): PermissionCatalogEntry {
  return {
    name,
    module,
    module_label,
    module_order: 0,
    module_is_optional: module === "blood-bank",
    group: "Group",
    description: name,
  }
}

const catalog = [
  entry("bb.a", "blood-bank", "Blood Bank"),
  entry("bb.b", "blood-bank", "Blood Bank"),
  entry("bb.c", "blood-bank", "Blood Bank"),
  entry("bill.a", "billing", "Billing"),
]
const roles: RoleTemplate[] = [
  {
    id: 1,
    name: "Sample collection",
    module: "blood-bank",
    description: null,
    permissions: ["bb.b", "bb.a"],
  },
  {
    id: 2,
    name: "Physician",
    module: "blood-bank",
    description: null,
    permissions: ["bb.b"],
  },
  {
    id: 3,
    name: "Cashier",
    module: "billing",
    description: null,
    permissions: ["bill.a"],
  },
]

function section(title: string): GrantSection {
  const found = buildGrantModules(catalog, roles)
    .flatMap((module) => module.sections)
    .find((candidate) => candidate.title === title)
  if (!found) {
    throw new Error(`missing section ${title}`)
  }
  return found
}

describe("grant modules", () => {
  it("groups templates under their module heading, then the module's permissions in no template", () => {
    expect(
      buildGrantModules(catalog, roles).map((module) => [
        module.label,
        module.sections.map((s) => [s.title, s.entries.map((e) => e.name)]),
      ])
    ).toEqual([
      [
        "Blood Bank",
        [
          ["Sample collection", ["bb.a", "bb.b"]],
          ["Physician", ["bb.b"]],
          ["Other Blood Bank permissions", ["bb.c"]],
        ],
      ],
      ["Billing", [["Cashier", ["bill.a"]]]],
    ])
  })

  it("shows none, some or all of a template as ticked", () => {
    const sampleCollection = section("Sample collection")
    expect(sectionState(sampleCollection, new Set())).toBe("none")
    expect(sectionState(sampleCollection, new Set(["bb.a"]))).toBe("some")
    expect(sectionState(sampleCollection, new Set(["bb.a", "bb.b"]))).toBe(
      "all"
    )
  })

  it("ticks the whole template from partial, and clears it from full, leaving other permissions alone", () => {
    const sampleCollection = section("Sample collection")
    expect(
      [...toggleSection(sampleCollection, new Set(["bb.a", "bill.a"]))].sort()
    ).toEqual(["bb.a", "bb.b", "bill.a"])
    expect([
      ...toggleSection(sampleCollection, new Set(["bb.a", "bb.b", "bill.a"])),
    ]).toEqual(["bill.a"])
  })

  it("offers an optional module only in branches that run it, and common modules everywhere", () => {
    const modules = buildGrantModules(catalog, roles)
    const labels = (branchModules: string[]) =>
      modulesForBranch(modules, branchModules).map((module) => module.label)

    expect(labels(["blood-bank"])).toEqual(["Blood Bank", "Billing"])
    expect(labels([])).toEqual(["Billing"])
    expect([...offeredNames(modulesForBranch(modules, []))]).toEqual(["bill.a"])
  })

  it("reports only fully ticked templates as applied", () => {
    const modules = buildGrantModules(catalog, roles)
    expect(fullyTickedRoleIds(modules, new Set(["bb.b"]))).toEqual([2])
    expect(fullyTickedRoleIds(modules, new Set(["bb.a", "bb.b"]))).toEqual([
      1, 2,
    ])
  })
})
