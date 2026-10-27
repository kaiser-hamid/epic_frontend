"use client"

import { AlertCircleIcon } from "lucide-react"

import { Forbidden } from "@/components/forbidden"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ErrorCode, errorMessage, hasErrorCode } from "@/lib/api-error"

/** Standard rendering for a failed query: 403 screen, or an alert with retry. */
export function QueryError({
  error,
  onRetry,
}: {
  error: unknown
  onRetry?: () => void
}) {
  if (hasErrorCode(error, ErrorCode.Forbidden)) {
    return <Forbidden />
  }

  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>Could not load data</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2">
        {errorMessage(error)}
        {onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}
