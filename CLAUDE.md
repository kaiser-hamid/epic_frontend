@AGENTS.md

# Epic Health Care ERP (frontend)

Next.js UI for the Epic Health Care ERP, a modular-monolith Laravel 13 backend for a diagnostic center (separate repo). The backend owns all business rules, validation, totals, permissions and audit; this app only displays and submits. First module: Blood Bank. Backend data flow reference: `modules/BloodBank/workflow.md` in the backend repo.

Next.js 16.4 (`cacheComponents` on), React 19.3, TypeScript (strict), Tailwind CSS v4, npm. Read `node_modules/next/dist/docs/` before using a Next API; this version differs from older training data (e.g. `middleware.ts` is now `proxy.ts`, Node runtime only). Several libraries are on new majors: check installed types/docs before writing code (TanStack Table **v9**, Zod **v4**, `eslint-plugin-boundaries` v7). TanStack Table ships agent docs in `node_modules/@tanstack/react-table/skills/`.

## Stack

| Concern       | Package                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------- |
| UI            | shadcn/ui (`radix-nova`, Radix) in `components/ui`, `lucide-react`, `sonner`; `cn` package  |
| Server state  | `@tanstack/react-query` v5                                                                  |
| HTTP          | `axios` (single instance in `lib/api-client.ts`)                                            |
| Forms         | `react-hook-form` + `zod` v4 + `@hookform/resolvers`; shadcn `Field` components             |
| Tables        | `@tanstack/react-table` v9 via `components/data-table`                                      |
| URL state     | `nuqs` (filters, sort, page)                                                                |
| Dates         | `date-fns` + `@date-fns/tz`                                                                 |
| Search / scan | `cmdk` (shadcn Command); barcode scanners act as keyboards                                  |
| Printing      | `react-to-print`, `jsbarcode`                                                               |
| Charts        | `recharts` via shadcn Chart (not installed yet; add with the first dashboard)               |
| Lint / format | ESLint (next config) + `eslint-plugin-boundaries`, Prettier + `prettier-plugin-tailwindcss` |
| Tests         | Vitest + Testing Library + MSW; Playwright for E2E                                          |

Do not add Redux, Zustand, Formik, NextAuth, moment, lodash or CSS-in-JS. Do not add or change dependencies without approval.

## Architecture

- Client-first: data is fetched in the browser with React Query against the Laravel API. Server Components render layouts and the static shell only. No Next route handlers or Server Actions for business data; Next is not a BFF.
- `next.config.ts` rewrites `/api/:path*` and `/sanctum/:path*` to `API_URL`, so the browser is same-origin with Laravel (first-party cookies, no CORS). Never create `app/api/`; it would shadow the rewrite.
- Business code lives in `modules/{name}/` (kebab-case, mirroring backend modules). `app/` is routing only.
- `cacheComponents`: anything reading request data (`params`, `useSearchParams`, `usePathname`) must sit under `<Suspense>`. `app/(app)/layout.tsx` and `app/(auth)/layout.tsx` already wrap their children, so pages under them may `await params` and use nuqs freely.
- Server → client props must be serializable. Anything holding components (icons, nav config) is composed in a client file (see `app/(app)/_components/app-frame.tsx`).

```
app/
  layout.tsx                            # root: fonts, <Providers>
  (auth)/login/  (auth)/change-password/  # centered-card pages, Suspense-wrapped
  (app)/layout.tsx                      # authenticated area, Suspense boundaries
  (app)/_components/app-frame.tsx       # registers module nav items for AppShell (client)
  (app)/blood-bank/cases/page.tsx                 # list
  (app)/blood-bank/cases/new/page.tsx             # create
  (app)/blood-bank/cases/[caseId]/page.tsx        # detail
  (app)/blood-bank/cases/[caseId]/edit/page.tsx   # edit
proxy.ts                                # optimistic session-cookie redirect only
modules/
  shared/                               # mirrors backend Shared
    auth/                               # useMe, login, logout, password, sessions, AuthGate, UserMenu
    rbac/                               # useCan, <Can>, <RequirePermission>
    layout/                             # AppShell (sidebar-07), NavMain, breadcrumbs, NavItem type
    patient/                            # patient lookup, PatientCombobox
  blood-bank/
    {resource}/                         # cases (reference implementation), component-types, …
      api.ts                            # endpoint functions; the only place that calls apiClient
      queries.ts                        # query-key factory + useXxx / mutation hooks
      schemas.ts                        # zod form schemas
      types.ts                          # API resource types, allowed filters/sorts
      error-messages.ts                 # backend error code → UI text
      components/                       # resource-specific components
    enums.ts                            # mirrors backend PHP enums
    permissions.ts                      # mirrors backend bb.* permission enum
    nav.ts                              # one sidebar parent item (icon) with permissioned sub-items
components/
  ui/                                   # shadcn generated; edit sparingly
  data-table/                           # DataTable, pagination, column helper, useListParams
  providers.tsx  form.tsx  logo.tsx  page-loader.tsx  page-header.tsx  confirm-dialog.tsx  reason-dialog.tsx
  money.tsx  date-time.tsx  forbidden.tsx  query-error.tsx
hooks/                                  # generic hooks (use-debounced-value, use-mobile)
lib/
  api-client.ts  api-error.ts  api-types.ts  query-client.ts  form-errors.ts
  dirty-values.ts  format.ts  route-params.ts  env.ts  utils.ts
tests/e2e/
```

`modules/blood-bank/cases` is the reference CRUD implementation. Copy its shape for new resources.

### Boundary rules (enforced by eslint-plugin-boundaries; do not break)

1. A business module may import `modules/shared`, `components`, `hooks`, `lib`, never another business module.
2. `modules/shared` imports only `components`, `hooks`, `lib`, never a business module.
3. `components` imports only `hooks` and `lib`; `hooks` only `lib`. Anything needing auth/RBAC lives in `modules/shared`.
4. `app/` pages compose module components; they contain no fetching, forms or business logic.
5. Something every module needs (print flow, reason dialog, money display) goes in `shared`/`components`, not copied per module.
6. Files under `components/` and `app/` may not import `axios` or `@/lib/api-client` (except `components/providers.tsx`).

## Auth (Laravel Sanctum, session cookie)

Endpoints live in the backend's `modules/Shared/Routes/api.php` (`auth` prefix).

- Laravel owns the session (httpOnly cookie, database driver) and the branch. No tokens in JS, no `localStorage` for auth, no NextAuth.
- `apiClient` uses `withCredentials: true` and `withXSRFToken: true`. Every POST/PUT/DELETE needs the CSRF cookie, so `fetchLoginBranches` and `login` call `GET /sanctum/csrf-cookie` first.
- Login is one form. On username blur: `POST /api/auth/login-branches` (`username`) → `Branch[]` (empty for unknown/inactive/locked accounts; throttled 10/min per IP, so never per keystroke). One branch is auto-selected. Then `POST /api/auth/login` (`username`, `password`, `branch_id`) → `Me`.
- The branch is fixed for the session. There is no switch-branch endpoint; working in another branch means signing out and in again.
- `Me` = `{ user: { id, employee_id, name, username, designation }, branch, permissions, is_super_admin, must_change_password }`.
- `must_change_password`: the backend answers every other route with `403 PASSWORD_CHANGE_REQUIRED` until `PUT /api/auth/password` (`current_password`, `password`, `password_confirmation`) succeeds. `AuthGate` and the login form send the user to `/change-password`. A successful change signs out the user's other sessions.
- Logout: `POST /api/auth/logout` (204). Login and logout `queryClient.clear()` (all data is branch-scoped), then seed `authKeys.me()`.
- Own sessions: `GET /api/auth/sessions`, `DELETE /api/auth/sessions/{id}`, `DELETE /api/auth/sessions` (others; returns `{ revoked }`). Hooks exist in `auth/queries.ts`; no screen yet.
- Login error codes: `INVALID_CREDENTIALS` (401), `ACCOUNT_LOCKED` (423, `locked_until` in `error.context`), `ACCOUNT_INACTIVE` (403), `BRANCH_ACCESS_DENIED` (403), `TOO_MANY_ATTEMPTS` (429), `VALIDATION_FAILED` on `branch_id`.
- Interceptor: `UNAUTHENTICATED` or `BRANCH_INACTIVE` (both 401; the backend ends the session when the branch is deactivated) → clear cache, redirect to `/login?next=…`, except on the `/api/auth/me` probe, where they mean "logged out". Other 401s (`INVALID_CREDENTIALS`) go to the form. `419` → refetch CSRF cookie and retry once. Everything becomes a typed `ApiError` (`status`, `code`, `errors`, `context` = extra body keys).
- Post-login redirects go through `safeNextPath` (same-origin paths only).
- `proxy.ts` only redirects when the `SESSION_COOKIE` cookie is missing (Laravel derives it from `APP_NAME`: `epic-erp-session`). It is UX, not security; Laravel authorizes every request and `AuthGate` handles expired sessions.

## RBAC

The backend decides; the frontend reflects. Never re-implement Policy or status rules in the UI.

- `useMe()` (`staleTime: Infinity`) returns user, the session branch, `is_super_admin`, `must_change_password`, and `permissions` for that branch.
- `useCan(permission)` / `<Can permission>` hide actions. Permission names come from each module's `permissions.ts` (`as const`), never string literals.
- Sidebar follows shadcn **sidebar-07**: each module exports one `NavItem` from `nav.ts` (title, lucide icon, `items` = sub-links each with a `permission`); register it in `app/(app)/_components/app-frame.tsx`. Parents expand into a sub menu with the left guide line; in icon-collapsed mode they open a dropdown. Links without permission are hidden, and a parent with no visible links disappears.
- The header shows breadcrumbs built from the URL and the nav config (module → page → remaining segments). Record pages replace the raw id with a readable label via `useBreadcrumbLabel(String(id), record?.case_no)` from `modules/shared/layout/breadcrumbs`.
- Every protected page wraps its content in `<RequirePermission>` (403 screen), because hiding a link does not protect a URL.
- Record-level actions use the `abilities` object the backend Resource returns (e.g. `record.abilities.cancel`), computed from its Policies (branch check, status, reprint rights). Prefer `abilities` over `useCan` whenever a record is involved.
- Roles are not checked in the UI. Super admin is only `is_super_admin` from `/me`.

## CRUD flow

Page → module component → `queries.ts` hook → `api.ts` → `apiClient` → Laravel → `{ data, meta }`.

- **List**: `useListParams()` keeps `page`, `per_page`, `sort` in the URL; filters use their own `useQueryStates` and call `resetPage()` on change. Hook params map to Spatie query-builder params (`filter[status]=open`, `sort=-created_at`, `include=patient`); `serializeParams` drops empty values. Use only filters/sorts/includes the backend allows (declare them in `types.ts`). `DataTable` renders server-side pages: column ids equal API sort fields, define columns at module scope with `dataTableColumnHelper<T>()`.
- **Create / update**: RHF + `zodResolver(schema)` + `Controller` with shadcn `Field`/`FieldError`. Update sends `PATCH` with `pickDirty(values, formState.dirtyFields)` only. Optional text fields are `""` in the form and `emptyToNull` in `api.ts`. On success: invalidate list and detail keys, toast, navigate.
- **Enter key in forms**: Enter moves focus to the next field; only Enter on the last field submits. Always render `<Form>` from `@/components/form`, never a raw `<form>` (lint error). It skips disabled/hidden fields and won't submit while the submit button is disabled. Enter keeps its native meaning in a textarea (new line), on buttons, and inside open selects/combobox lists/popovers (barcode scans in a search box still work). Mark any other element that must handle Enter itself with `data-enter-key="native"`. Keep fields in the DOM in the order users fill them, with the submit button last.
- **Errors**: branch on `code`, never `message`. `applyServerErrors(error, form.setError)` maps `VALIDATION_FAILED`; otherwise `toast.error(errorMessage(error, moduleErrorMessages))`. Failed queries render `<QueryError>` (403 → `<Forbidden>`).
- **Delete**: there are no hard deletes. Use status actions (cancel, deactivate, discard) behind `ConfirmDialog`, or `ReasonDialog` where the backend requires a reason.
- **State transitions**: one mutation hook and endpoint per backend Action (`useCancelCase` → `POST /api/blood-bank/cases/{id}/cancel`). Show the button only when `abilities` allows it. After success, invalidate every affected key (e.g. unit, case, unit movements).
- **Versioned records** (test results, crossmatches): no edit. "Amend" opens a dialog requiring `amendment_reason`; show version history.
- **Printing**: call the print-log endpoint first; on `REPRINT_REASON_REQUIRED` open `ReasonDialog` and retry; print with `react-to-print` only after the log succeeds.
- Query keys come from a per-resource factory prefixed by module: `caseKeys.all = ["blood-bank", "cases"]`, `.lists()`, `.list(params)`, `.detail(id)`.
- Route ids: `parseRouteId((await params).caseId)` and `notFound()` on null; pass the number to the module component.

## Conventions

- TypeScript strict with `noUncheckedIndexedAccess`; no `any`, no non-null `!` (both are lint errors).
- API types and form fields use the backend's `snake_case` keys as-is; no case-mapping layer. Types are hand-written in `types.ts` until the backend publishes an OpenAPI spec.
- Files kebab-case (`case-form.tsx`), components PascalCase, hooks `useXxx`. Named exports, except where Next requires default (`page`, `layout`, `error`, …).
- `"use client"` only on interactive leaves, not on layouts or whole pages.
- Components never call `axios`/`fetch`; always go through the module's `queries.ts`.
- Enums: `as const` object + derived union type, values copied exactly from the backend PHP enum, plus a `Record<Enum, string>` label map. No TS `enum`, no magic strings for statuses, types or permissions.
- Money: integer paisa everywhere in state and payloads. Display with `<Money paisa>` / `formatTaka`. Never compute totals in the UI; show the server's.
- Dates: API sends ISO 8601; display in `Asia/Dhaka` via `<DateTime>` / `lib/format.ts`. Send ISO strings back.
- Human-facing numbers (`case_no`, `unit_no`, `invoice_no`) come from the API; never generate them in the UI.
- Styling: Tailwind utilities and shadcn tokens (`bg-background`, `text-muted-foreground`); merge classes with `cn()` from `@/lib/utils`. Icons in buttons use `data-icon="inline-start|inline-end"`. No inline styles, no hardcoded colors.
- Check `components/`, `components/ui` and `modules/shared` for an existing component before writing a new one. Add shadcn components with `npx shadcn@latest add <name>`.
- Branding: use `<Logo>` (full wordmark, size by height) or `<LogoMark>` (square "E" for tight spots) from `@/components/logo`; never reference the image files directly. Source: `public/assets/images/default/epic_logo.png`; `epic_mark.png` and `app/icon.png` (favicon) are cropped from it.
- Loading states: `<PageLoader>` (animated Epic logo, full screen) only for page-level waits such as the session check and app-shell Suspense; `Skeleton` for content inside a page; `Spinner` inside buttons and inputs.
- UI text is English.
- `process.env` only in `next.config.ts`, `lib/env.ts` (server-only, zod-validated) and test configs.
- Prettier style: no semicolons, double quotes, trailing commas (es5). Run `npm run format` before finishing.

## Testing

- Unit tests sit next to the file (`schemas.test.ts`). Only test behavior: zod schemas that encode rules, error-code handling (`VALIDATION_FAILED` → field errors, `REPRINT_REASON_REQUIRED` → reason dialog), permission/abilities gating, query invalidation after mutations, security helpers. Mock the API with MSW.
- E2E (Playwright, `tests/e2e/`) covers key flows only, e.g. login + branch → open case → patient sample → crossmatch → issue unit. Needs the backend running.
- No snapshot tests, no tests of markup, styling or shadcn components.
- Don't add tests for every change by default; if unsure whether a test is worth it, ask.

## Commands

- Dev: `npm run dev` (backend: `php artisan serve`; copy `.env.example` to `.env.local` and set `API_URL`, `SESSION_COOKIE`)
- Build: `npm run build` (catches missing Suspense boundaries that dev does not)
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Format: `npm run format` / `npm run format:check`
- Tests: `npm test` / `npm run test:e2e` (first run: `npx playwright install chromium`)

## Adding a module

Create `modules/{name}/` with `enums.ts`, `permissions.ts` (mirroring the backend permission enum), `nav.ts`, and one folder per resource (`api.ts`, `queries.ts`, `schemas.ts`, `types.ts`, `error-messages.ts`, `components/`). Add routes under `app/(app)/{name}/` wrapped in `<RequirePermission>`, and add its nav item to `app/(app)/_components/app-frame.tsx`. The boundaries config picks up `modules/*` automatically.

## Backend contract

The backend repo is checked out at `../backend`; read its routes, Data classes, Resources and exceptions instead of guessing.

Confirmed from the backend: auth endpoints and `Me` shape (see Auth), error rendering in `bootstrap/app.php` (`UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CSRF_TOKEN_MISMATCH` 419, `TOO_MANY_ATTEMPTS` 429, `VALIDATION_FAILED` 422, domain exceptions add their `context()` keys), and Shared permissions (`sh.user.*`, `sh.role.*`).

Also confirmed: every paginated collection returns `meta = { page_index (zero-based), page_size, page_count, row_count }` (`SharedServiceProvider::bootPagination`); the request stays one-based `page` + `per_page`. Blood Bank routes are `GET/POST /api/blood-bank/cases`, `GET /cases/{id}`, `GET /donors?filter[search]=` (permissions `bb.case.view`, `bb.case.create`, `bb.donor.view`); case request/response shapes are in `modules/blood-bank/api_reference.md`. Patient search is `GET /api/patients?filter[search]=…` (`sh.patient.view`).

Not in the backend yet: `abilities` on Resources, case update/cancel endpoints, and lookups for test items, doctors, staff and component types (the case form takes raw IDs for these until they exist).
