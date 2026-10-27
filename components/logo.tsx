import Image from "next/image"

import { cn } from "@/lib/utils"
import logo from "@/public/assets/images/default/epic_logo.png"
import mark from "@/public/assets/images/default/epic_mark.png"

/** Full "Epic Health Care" wordmark. Size it by height (`h-8`); width follows. */
export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src={logo}
      alt="Epic Health Care"
      priority
      className={cn("h-8 w-auto", className)}
    />
  )
}

/** Square "E" mark for tight spots (collapsed sidebar). Decorative next to a text label. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src={mark}
      alt=""
      aria-hidden
      priority
      className={cn("size-8", className)}
    />
  )
}
