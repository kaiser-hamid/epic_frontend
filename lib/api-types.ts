/** `{ "data": ... }` envelope for a single resource. */
export type ResourceResponse<T> = {
  data: T
}

/** Laravel paginator `meta` block. */
export type PaginationMeta = {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
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
