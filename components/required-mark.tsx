/** Small red asterisk after a label; the input itself carries the required rule. */
export function RequiredMark() {
  return (
    <span aria-hidden className="text-xs text-destructive">
      *
    </span>
  )
}
