"use client"

import JsBarcode from "jsbarcode"
import { useLayoutEffect, useRef } from "react"

/**
 * Code128 barcode drawn as SVG, for printed labels. Drawn before the parent's effects
 * run, so a print triggered from the parent sees the bars.
 */
export function Barcode({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  const ref = useRef<SVGSVGElement>(null)

  useLayoutEffect(() => {
    if (!ref.current) {
      return
    }
    JsBarcode(ref.current, value, {
      format: "CODE128",
      displayValue: false,
      margin: 0,
      height: 40,
      width: 2,
    })
    // Fill the box the label gives it; bars scale evenly, so scanning is unaffected.
    ref.current.setAttribute("preserveAspectRatio", "none")
  }, [value])

  return <svg ref={ref} role="img" aria-label={value} className={className} />
}
