"use client"

import { CheckBox } from "@/components/check-box"
import { cn } from "@/lib/utils"
import {
  sectionState,
  toggleNames,
  toggleSection,
  type GrantModule,
  type GrantSection,
} from "@/modules/user-management/permissions/grant-sections"

type GrantEditorProps = {
  modules: GrantModule[]
  checked: ReadonlySet<string>
  onChange: (next: Set<string>) => void
  disabled?: boolean
}

/**
 * Module headings (layout only), their role templates indented under a guide line, and each template's
 * permissions indented once more. A template box ticks or clears all its permissions and shows a dash when only
 * some are ticked. A permission in two templates ticks in both.
 */
export function GrantEditor({
  modules,
  checked,
  onChange,
  disabled = false,
}: GrantEditorProps) {
  return (
    <div className="flex flex-col gap-6">
      {modules.map((module) => {
        const ticked = module.sections
          .flatMap((section) => section.entries)
          .filter(
            (entry, index, all) =>
              checked.has(entry.name) &&
              all.findIndex((other) => other.name === entry.name) === index
          ).length
        return (
          <section key={module.key} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2 px-2">
              <h3 className="text-sm font-semibold tracking-wide uppercase">
                {module.label}
              </h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                {ticked > 0 ? `${ticked} selected` : null}
              </span>
            </div>
            <div className="ml-2 flex flex-col gap-3 border-l-2 pl-3">
              {module.sections.map((section) => (
                <TemplateSection
                  key={section.key}
                  section={section}
                  checked={checked}
                  onChange={onChange}
                  disabled={disabled}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function TemplateSection({
  section,
  checked,
  onChange,
  disabled,
}: {
  section: GrantSection
  checked: ReadonlySet<string>
  onChange: (next: Set<string>) => void
  disabled: boolean
}) {
  const state = sectionState(section, checked)
  const ticked = section.entries.filter((entry) =>
    checked.has(entry.name)
  ).length
  const sectionId = `grant-${section.key}`

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50">
        <CheckBox
          id={sectionId}
          checked={
            state === "all" ? true : state === "some" ? "indeterminate" : false
          }
          disabled={disabled}
          onCheckedChange={() => onChange(toggleSection(section, checked))}
        />
        <label
          htmlFor={sectionId}
          className={cn(
            "flex-1 cursor-pointer font-medium",
            section.roleId === null && "text-muted-foreground"
          )}
        >
          {section.title}
        </label>
        <span
          className={cn(
            "text-xs text-muted-foreground tabular-nums",
            state === "all" && "font-medium text-success"
          )}
        >
          {ticked}/{section.entries.length}
        </span>
      </div>

      <ul className="ml-4.5 flex flex-col border-l-2 pl-3">
        {section.entries.map((entry) => {
          const id = `${sectionId}-${entry.name}`
          return (
            <li
              key={entry.name}
              className="flex items-start gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
            >
              <CheckBox
                id={id}
                className="mt-0.5"
                checked={checked.has(entry.name)}
                disabled={disabled}
                onCheckedChange={(value) =>
                  onChange(toggleNames(checked, [entry.name], value === true))
                }
              />
              <label
                htmlFor={id}
                className="flex flex-1 cursor-pointer flex-col"
              >
                <span className="text-sm">
                  {entry.description ?? entry.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {entry.name}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
