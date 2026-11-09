"use client"

/** How long an opened PDF keeps its object URL (long enough to print or save from it). */
const PDF_URL_LIFETIME_MS = 10 * 60 * 1000

/**
 * Opens a PDF in a new tab (the browser's PDF viewer). Returns false when the browser blocked
 * the tab, e.g. because the click that started it was too long ago.
 */
export function openPdf(blob: Blob): boolean {
  const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }))
  const opened = window.open(url, "_blank")
  window.setTimeout(() => URL.revokeObjectURL(url), PDF_URL_LIFETIME_MS)
  return opened !== null
}
