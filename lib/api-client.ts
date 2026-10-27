import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"

import { ApiError, ErrorCode, type ValidationErrors } from "@/lib/api-error"
import type { ListParams } from "@/lib/api-types"

type ErrorBody = {
  message?: string
  code?: string
  errors?: ValidationErrors
  [key: string]: unknown
}

type RetriableConfig = InternalAxiosRequestConfig & { _csrfRetried?: boolean }

/**
 * Single HTTP client for the Laravel API. Same-origin (see rewrites in
 * next.config.ts): Sanctum's session cookie and XSRF-TOKEN travel automatically.
 */
export const apiClient = axios.create({
  baseURL: "",
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  paramsSerializer: { serialize: serializeParams },
})

export function fetchCsrfCookie(): Promise<unknown> {
  return apiClient.get("/sanctum/csrf-cookie")
}

let unauthenticatedHandler: (() => void) | null = null

/** Registered once by the app providers: clear cache and send the user to login. */
export function onUnauthenticated(handler: () => void): () => void {
  unauthenticatedHandler = handler
  return () => {
    if (unauthenticatedHandler === handler) {
      unauthenticatedHandler = null
    }
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!(error instanceof AxiosError)) {
      throw error
    }

    const config = error.config as RetriableConfig | undefined
    const status = error.response?.status

    // CSRF token expired: refresh the cookie and replay the request once.
    if (status === 419 && config && !config._csrfRetried) {
      config._csrfRetried = true
      await fetchCsrfCookie()
      return apiClient.request(config)
    }

    const apiError = toApiError(error)

    if (isSessionLost(apiError) && !isAuthProbe(config)) {
      unauthenticatedHandler?.()
    }

    throw apiError
  }
)

/**
 * Session expired, or its branch was deactivated (the backend then ends the session).
 * Other 401s, like `INVALID_CREDENTIALS` on login, are answers for the form.
 */
function isSessionLost(error: ApiError): boolean {
  return (
    error.code === ErrorCode.Unauthenticated ||
    error.code === ErrorCode.BranchInactive
  )
}

/** `/api/auth/me` 401s are an expected answer ("not logged in"), not an expiry. */
function isAuthProbe(config: InternalAxiosRequestConfig | undefined): boolean {
  return config?.url === "/api/auth/me"
}

function toApiError(error: AxiosError): ApiError {
  if (!error.response) {
    return new ApiError({
      status: 0,
      code: ErrorCode.NetworkError,
      message: error.message,
    })
  }

  const { status, data } = error.response
  const { message, code, errors, ...context } = (data ?? {}) as ErrorBody

  return new ApiError({
    status,
    code: code ?? fallbackCode(status),
    message: message ?? error.message,
    errors,
    context,
  })
}

function fallbackCode(status: number): string {
  switch (status) {
    case 401:
      return ErrorCode.Unauthenticated
    case 403:
      return ErrorCode.Forbidden
    case 404:
      return ErrorCode.NotFound
    case 419:
      return ErrorCode.CsrfMismatch
    case 422:
      return ErrorCode.ValidationFailed
    case 429:
      return ErrorCode.TooManyAttempts
    default:
      return ErrorCode.Unknown
  }
}

/**
 * Spatie query-builder format: `filter[status]=open&sort=-created_at&include=patient,components`.
 * Empty values are dropped so cleared filters disappear from the request.
 */
export function serializeParams(
  params: ListParams | Record<string, unknown>
): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (isEmpty(value)) {
      continue
    }

    if (
      key === "filter" &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      for (const [field, filterValue] of Object.entries(value as object)) {
        if (!isEmpty(filterValue)) {
          search.append(`filter[${field}]`, String(filterValue))
        }
      }
      continue
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        search.append(key, value.join(","))
      }
      continue
    }

    search.append(key, String(value))
  }

  return search.toString()
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === ""
}
