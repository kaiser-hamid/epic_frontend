/** `{ "data": ... }` envelope for a single resource. */
export type ResourceResponse<T> = {
  data: T
}

/**
 * `meta` of every paginated collection (backend `SharedServiceProvider::bootPagination`).
 * The response is zero-based (`page_index`); the request `page` param is one-based.
 */
export type PaginationMeta = {
  page_index: number
  page_size: number
  page_count: number
  row_count: number
}

/** `{ "data": [...], "meta": {...} }` envelope for a paginated collection. */
export type PaginatedResponse<T> = {
  data: T[]
  meta: PaginationMeta
}

/** Record-level permissions computed by the backend Policies. */
export type Abilities<TAction extends string> = Record<TAction, boolean>

/** Query-string for Spatie query-builder list endpoints. */
export type ListParams = {
  filter?: Record<string, string | number | boolean | null | undefined>
  /** `created_at` or `-created_at`; comma-separate several. */
  sort?: string | null
  include?: string[]
  page?: number
  per_page?: number
}
