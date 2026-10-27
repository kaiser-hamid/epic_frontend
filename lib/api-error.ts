/** Error codes the backend renders in `{ message, code }`. Branch UI logic on these, never on `message`. */
export const ErrorCode = {
  ValidationFailed: "VALIDATION_FAILED",
  Unauthenticated: "UNAUTHENTICATED",
  Forbidden: "FORBIDDEN",
  NotFound: "NOT_FOUND",
  CsrfMismatch: "CSRF_TOKEN_MISMATCH",
  TooManyAttempts: "TOO_MANY_ATTEMPTS",
  BranchInactive: "BRANCH_INACTIVE",
  PasswordChangeRequired: "PASSWORD_CHANGE_REQUIRED",
  ReprintReasonRequired: "REPRINT_REASON_REQUIRED",
  NetworkError: "NETWORK_ERROR",
  Unknown: "UNKNOWN",
} as const

export type KnownErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]

export type ValidationErrors = Record<string, string[]>

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly errors: ValidationErrors
  /** Extra machine-readable keys from the body (a DomainException's `context()`, e.g. `locked_until`). */
  readonly context: Record<string, unknown>

  constructor(params: {
    status: number
    code: string
    message: string
    errors?: ValidationErrors
    context?: Record<string, unknown>
  }) {
    super(params.message)
    this.name = "ApiError"
    this.status = params.status
    this.code = params.code
    this.errors = params.errors ?? {}
    this.context = params.context ?? {}
  }

  get isValidation(): boolean {
    return this.code === ErrorCode.ValidationFailed
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function hasErrorCode(error: unknown, code: string): error is ApiError {
  return isApiError(error) && error.code === code
}

const genericMessages: Partial<Record<string, string>> = {
  [ErrorCode.Forbidden]: "You do not have permission to do this.",
  [ErrorCode.NotFound]: "The record was not found.",
  [ErrorCode.NetworkError]: "Cannot reach the server. Check your connection.",
  [ErrorCode.ValidationFailed]: "Please fix the highlighted fields.",
  [ErrorCode.TooManyAttempts]:
    "Too many attempts. Wait a minute and try again.",
  [ErrorCode.BranchInactive]: "This branch is no longer active. Sign in again.",
}

/**
 * Text for a toast. Pass a module's code map first; falls back to shared text,
 * then to a generic message. Raw backend `message` is never shown for logic.
 */
export function errorMessage(
  error: unknown,
  codeMessages: Partial<Record<string, string>> = {}
): string {
  if (!isApiError(error)) {
    return "Something went wrong. Please try again."
  }

  return (
    codeMessages[error.code] ??
    genericMessages[error.code] ??
    "Something went wrong. Please try again."
  )
}
