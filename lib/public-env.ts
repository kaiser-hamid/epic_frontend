/**
 * Browser-visible configuration (`NEXT_PUBLIC_*`). Each variable must be read as a literal
 * `process.env.NEXT_PUBLIC_X` so Next can inline it into the client bundle; the defaults match
 * a standard workstation.
 */
export const publicEnv = {
  printServiceUrl: (
    process.env.NEXT_PUBLIC_PRINT_SERVICE_URL || "http://127.0.0.1:9555"
  ).replace(/\/+$/, ""),
  /** Guards a loopback port, not user data. */
  printApiKey:
    process.env.NEXT_PUBLIC_PRINT_API_KEY || "epichealthcare@2026printserver",
  /** Installed name of the laser printer loaded with pre-printed letterhead. */
  reportPrinter: process.env.NEXT_PUBLIC_REPORT_PRINTER || "report_printer",
  /** Installed name of the GoDEX barcode label printer. */
  barcodePrinter: process.env.NEXT_PUBLIC_BARCODE_PRINTER || "barcode_printer",
  /** Installed name of the GoDEX printer for blood bag and component labels. */
  labelPrinter: process.env.NEXT_PUBLIC_LABEL_PRINTER || "label_printer",
} as const
