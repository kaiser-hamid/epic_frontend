import type {
  PermissionCatalogEntry,
  RoleTemplate,
} from "@/modules/user-management/users/types"

/** A selectable block of the grants editor: one role template, or a module's permissions no template contains. */
export type GrantSection = {
  key: string
  /** Null for a module's "Other … permissions" block. */
  roleId: number | null
  title: string
  entries: PermissionCatalogEntry[]
}

/** A module heading (layout only, not selectable) with its sections. */
export type GrantModule = {
  key: string
  label: string
  sections: GrantSection[]
}

/** How much of a section is ticked: drives the section checkbox (empty, dash, check). */
export type SectionState = "none" | "some" | "all"

/**
 * Modules in catalog order (the backend sorts by `module_order`). Within each: its role templates (by name, as
 * the API sends them), then "Other <module> permissions" for the module's entries in no template, so every
 * permission can be ticked. Entries keep catalog order; names outside the template's module are skipped.
 */
export function buildGrantModules(
  catalog: PermissionCatalogEntry[],
  roles: RoleTemplate[]
): GrantModule[] {
  const order = new Map(catalog.map((entry, index) => [entry.name, index]))
  const modules = new Map<
    string,
    { label: string; entries: PermissionCatalogEntry[] }
  >()
  for (const entry of catalog) {
    const bucket = modules.get(entry.module) ?? {
      label: entry.module_label,
      entries: [],
    }
    bucket.entries.push(entry)
    modules.set(entry.module, bucket)
  }

  return [...modules].map(([key, { label, entries: moduleEntries }]) => {
    const byName = new Map(moduleEntries.map((entry) => [entry.name, entry]))
    const inSomeRole = new Set<string>()
    const sections: GrantSection[] = []

    for (const role of roles) {
      if (role.module !== key) {
        continue
      }
      const entries = role.permissions
        .flatMap((name) => byName.get(name) ?? [])
        .sort((a, b) => (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0))
      if (entries.length === 0) {
        continue
      }
      entries.forEach((entry) => inSomeRole.add(entry.name))
      sections.push({
        key: `role-${role.id}`,
        roleId: role.id,
        title: role.name,
        entries,
      })
    }

    const others = moduleEntries.filter((entry) => !inSomeRole.has(entry.name))
    if (others.length > 0) {
      sections.push({
        key: `other-${key}`,
        roleId: null,
        title: `Other ${label} permissions`,
        entries: others,
      })
    }

    return { key, label, sections }
  })
}

export function sectionState(
  section: GrantSection,
  checked: ReadonlySet<string>
): SectionState {
  const ticked = section.entries.filter((entry) => checked.has(entry.name))
  if (ticked.length === 0) {
    return "none"
  }
  return ticked.length === section.entries.length ? "all" : "some"
}

/** Clicking a section box: a fully ticked section is cleared, anything else becomes fully ticked. */
export function toggleSection(
  section: GrantSection,
  checked: ReadonlySet<string>
): Set<string> {
  const on = sectionState(section, checked) !== "all"
  return toggleNames(
    checked,
    section.entries.map((entry) => entry.name),
    on
  )
}

export function toggleNames(
  checked: ReadonlySet<string>,
  names: string[],
  on: boolean
): Set<string> {
  const next = new Set(checked)
  for (const name of names) {
    if (on) {
      next.add(name)
    } else {
      next.delete(name)
    }
  }
  return next
}

/** Role templates fully ticked at save time, sent as `applied_role_ids` for the audit log. */
export function fullyTickedRoleIds(
  modules: GrantModule[],
  checked: ReadonlySet<string>
): number[] {
  return modules.flatMap((module) =>
    module.sections.flatMap((section) =>
      section.roleId !== null && sectionState(section, checked) === "all"
        ? [section.roleId]
        : []
    )
  )
}

export function sameSelection(
  checked: ReadonlySet<string>,
  saved: readonly string[]
): boolean {
  return (
    checked.size === saved.length && saved.every((name) => checked.has(name))
  )
}
