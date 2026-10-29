import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** Display-only value laid out like a field. Not a Tab or Enter stop. */
export function ReadonlyInput({
  value,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "readOnly"> & {
  value: string | null | undefined
}) {
  return (
    <Input
      readOnly
      tabIndex={-1}
      value={value ?? ""}
      placeholder="—"
      className={cn("bg-muted/50 focus-visible:ring-0", className)}
      {...props}
    />
  )
}
