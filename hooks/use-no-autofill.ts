import { useCallback, type Ref } from "react"

type TextControl = HTMLInputElement | HTMLTextAreaElement

/**
 * Attributes that keep browsers and password managers from offering their own suggestion
 * dropdowns, which steal Arrow and Enter from the field.
 * - `autoComplete="off"` at rest: Chrome neither saves the value nor lists earlier entries.
 *   While focused, `useNoAutofillRef` swaps it (see there).
 * - `data-*`: opt-outs read by 1Password, LastPass, Bitwarden and Dashlane.
 */
export const noAutofillProps = {
  autoComplete: "off",
  "data-1p-ignore": "true",
  "data-lpignore": "true",
  "data-bwignore": "true",
  "data-form-type": "other",
} as const

/**
 * Chrome ignores "off" for address autofill on name/phone/address-like fields, and even with
 * an unrecognized token ("nope") it offers saved contact values once the typed text matches
 * one. A recognized non-address type that Chrome never fills on desktop makes it classify the
 * field as that type, so no address suggestions on focus or while typing. Any value other than
 * "off" turns its list of earlier entries back on, so it is paired with a fresh random `name`
 * (the key of that list).
 */
const FOCUSED_AUTOCOMPLETE = "one-time-code"

function randomFieldName() {
  return `f-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

/**
 * Callback ref that, on every focus, gives the element a new random DOM `name` and
 * `FOCUSED_AUTOCOMPLETE` (back to "off" on blur), then forwards to `ref`. Chrome
 * asks for suggestions after the focus event, so it never sees a name with saved entries
 * nor a field it will offer addresses for. Done in the DOM so server and client markup match.
 */
export function useNoAutofillRef<T extends TextControl>(ref?: Ref<T>) {
  return useCallback(
    (node: T | null) => {
      if (!node) {
        return
      }
      const onFocus = () => {
        node.name = randomFieldName()
        node.setAttribute("autocomplete", FOCUSED_AUTOCOMPLETE)
      }
      const onBlur = () => {
        node.setAttribute("autocomplete", noAutofillProps.autoComplete)
      }
      node.addEventListener("focus", onFocus)
      node.addEventListener("blur", onBlur)
      // `autoFocus` fires before the ref is attached.
      if (node.ownerDocument.activeElement === node) {
        onFocus()
      }
      const forwardedCleanup = forwardRef(ref, node)

      return () => {
        node.removeEventListener("focus", onFocus)
        node.removeEventListener("blur", onBlur)
        if (typeof forwardedCleanup === "function") {
          forwardedCleanup()
        } else {
          forwardRef(ref, null)
        }
      }
    },
    [ref]
  )
}

function forwardRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") {
    return ref(node)
  }
  if (ref) {
    ref.current = node
  }
}
