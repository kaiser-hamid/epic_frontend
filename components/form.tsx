"use client"

import type { ComponentProps, KeyboardEvent } from "react"

/** Fields that Enter moves between, in DOM order. Buttons are not stops. */
const FIELD_SELECTOR = [
  "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset])",
  "select",
  "textarea",
  "[role=combobox]",
  "[role=checkbox]",
  "[role=radio]",
  "[role=switch]",
].join(",")

function isFieldStop(element: Element): element is HTMLElement {
  return (
    element instanceof HTMLElement &&
    !element.matches(":disabled, [aria-disabled=true], [tabindex='-1']") &&
    !element.closest("[inert], fieldset:disabled") &&
    (element.checkVisibility?.() ?? true)
  )
}

/**
 * Enter moves focus to the next field; on the last field it submits.
 * Left to the browser/component: Enter in a textarea (new line), on a button,
 * inside a portal (open select, combobox list, popover), on an expanded
 * combobox, or under `data-enter-key="native"`.
 */
export function handleEnterKeyNavigation(
  event: KeyboardEvent<HTMLFormElement>
) {
  if (
    event.key !== "Enter" ||
    event.nativeEvent.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return
  }

  const form = event.currentTarget
  const target = event.target
  if (
    !(target instanceof HTMLElement) ||
    !form.contains(target) ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLButtonElement && target.role !== "combobox") ||
    target.getAttribute("aria-expanded") === "true" ||
    target.closest("[data-enter-key=native]")
  ) {
    return
  }

  const fields = Array.from(form.querySelectorAll(FIELD_SELECTOR)).filter(
    isFieldStop
  )
  const index = fields.indexOf(target)
  if (index === -1) {
    return
  }

  event.preventDefault()

  const next = fields[index + 1]
  if (next) {
    next.focus()
    if (next instanceof HTMLInputElement) {
      next.select()
    }
    return
  }

  const submitter = Array.from(form.elements).find(
    (element): element is HTMLButtonElement | HTMLInputElement =>
      (element instanceof HTMLButtonElement ||
        element instanceof HTMLInputElement) &&
      element.type === "submit"
  )
  if (submitter?.disabled) {
    return
  }
  form.requestSubmit(submitter)
}

/** Use instead of `<form>` so every form gets Enter-to-next-field behavior. */
export function Form({ onKeyDownCapture, ...props }: ComponentProps<"form">) {
  return (
    <form
      noValidate
      onKeyDownCapture={(event) => {
        onKeyDownCapture?.(event)
        handleEnterKeyNavigation(event)
      }}
      {...props}
    />
  )
}
