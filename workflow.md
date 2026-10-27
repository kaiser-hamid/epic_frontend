# Frontend workflow

How the Epic Health Care ERP frontend is laid out, what each screen does, and how data moves between the browser and the Laravel backend. Coding rules live in `CLAUDE.md`; the backend's table-level flow lives in `../backend/modules/BloodBank/workflow.md`.

## 1. Runtime picture

```
Browser (React, React Query)
   │  same-origin requests: /api/*, /sanctum/*   (session + XSRF-TOKEN cookies)
   ▼
Next.js 16 server
   │  proxy.ts: no session cookie → /login?next=…
   │  next.config.ts rewrites /api/* and /sanctum/* → API_URL
   ▼
Laravel 13 (../backend)
   session auth (Sanctum, database sessions) → branch check → permission check → Action → { data, meta }
```

- Next.js serves the shell (layouts, static HTML) and proxies the API. It holds no business data and has no route handlers or Server Actions.
- All business data is fetched in the browser with React Query through `lib/api-client.ts`.
- Because the API is reached through a rewrite, the browser sees a single origin: cookies are first-party and there is no CORS.

## 2. Project structure

```
app/                          Routing only. Pages compose module components.
  layout.tsx                  Root: font, <Providers> (React Query, nuqs, tooltips, toasts)
  (auth)/                     Centered-card layout, no sidebar
    login/                    Sign in (username, password, branch)
    change-password/          Forced or voluntary password change
  (app)/                      Authenticated area
    layout.tsx                Suspense boundaries around the shell and the page
    _components/app-frame.tsx Registers each module's nav item
    page.tsx                  Dashboard (placeholder)
    blood-bank/cases/…        Case list, create, detail, edit
proxy.ts                      Redirects to /login when the session cookie is missing

modules/                      Business code, mirroring backend modules
  shared/                     Mirrors backend Shared
    auth/                     Session: me, login, logout, password, sessions; AuthGate, UserMenu
    rbac/                     useCan, <Can>, <RequirePermission>
    layout/                   AppShell (sidebar-07), NavMain, breadcrumbs, NavItem type
    patient/                  Patient search + PatientCombobox
  blood-bank/
    enums.ts                  Copies of backend PHP enums + labels
    permissions.ts            Copies of backend bb.* permission names
    nav.ts                    Sidebar parent item + sub-links
    component-types/          Lookup used by case forms
    cases/                    Reference CRUD resource

components/                   Generic UI, no business knowledge
  ui/                         shadcn components
  data-table/                 Server-paginated table, URL list params
  page-header, money, date-time, confirm-dialog, reason-dialog, forbidden, query-error, providers

hooks/                        Generic hooks (debounced value, mobile breakpoint)
lib/                          API client, error type, query client, formatting, form helpers, env
tests/e2e/                    Playwright flows (need the backend running)
```

Every resource folder has the same files:

| File                | Role                                                            |
| ------------------- | --------------------------------------------------------------- |
| `types.ts`          | API resource shape, allowed filters and sorts                   |
| `api.ts`            | One function per endpoint; the only code that calls `apiClient` |
| `queries.ts`        | Query-key factory, `useXxx` queries and mutation hooks          |
| `schemas.ts`        | Zod schemas for forms                                           |
| `error-messages.ts` | Backend error `code` → text shown to the user                   |
| `components/`       | Table, forms, detail view, action buttons for this resource     |

Import direction is enforced by ESLint (`eslint-plugin-boundaries`): `app → modules → shared → components → hooks → lib`. A business module never imports another business module.

## 3. Request lifecycle

```
Page (app/)                     awaits params, wraps content in <RequirePermission>
 └ Module component             e.g. <CaseTable>, <CaseCreateForm>
    └ queries.ts hook           useCases(params) / useCreateCase()
       └ api.ts function        listCases(params) → GET /api/blood-bank/cases?filter[status]=open&sort=-created_at
          └ apiClient (axios)   cookies, X-XSRF-TOKEN, Spatie param serialization
             └ Laravel          { data } | { data, meta } | { message, code, errors? }
```

Responses:

- Success: `{ data }`, and for lists `{ data, meta }` with Laravel pagination meta.
- Error: `{ message, code }`, plus `errors` for `VALIDATION_FAILED` and any extra keys a domain exception adds (e.g. `locked_until`). The client turns every failure into an `ApiError { status, code, errors, context }`. UI logic branches on `code`, never on `message`.

Interceptor behavior (`lib/api-client.ts`):

| Response                                      | What happens                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| `419 CSRF_TOKEN_MISMATCH`                     | Fetch `/sanctum/csrf-cookie`, replay the request once                      |
| `401 UNAUTHENTICATED` / `401 BRANCH_INACTIVE` | Clear the cache, go to `/login?next=<current page>`                        |
| Same, on the `/api/auth/me` probe             | Treated as "logged out" (`useMe()` returns `null`)                         |
| Other 401 (e.g. `INVALID_CREDENTIALS`)        | Returned to the caller, shown on the form                                  |
| No response                                   | `NETWORK_ERROR`                                                            |
| Anything without `code`                       | Code derived from status (403 → `FORBIDDEN`, 429 → `TOO_MANY_ATTEMPTS`, …) |

## 4. Authentication

Backend routes: `../backend/modules/Shared/Routes/api.php`.

### Sign in

```
/login
  1. User types username, leaves the field
  2. GET  /sanctum/csrf-cookie
     POST /api/auth/login-branches { username }          → Branch[]
        empty list for unknown, inactive or locked accounts (no account details leak)
        throttled 10/min per IP, so it runs on blur, not per keystroke
        exactly one branch → auto-selected
  3. User enters password, picks branch, submits
  4. GET  /sanctum/csrf-cookie
     POST /api/auth/login { username, password, branch_id } → Me
  5. Cache cleared, Me seeded
  6. must_change_password ? /change-password?next=… : next (validated by safeNextPath)
```

`Me` (`GET /api/auth/me`, also returned by login):

```json
{
  "data": {
    "user": {
      "id": 1,
      "employee_id": "E-001",
      "name": "…",
      "username": "…",
      "designation": "…"
    },
    "branch": { "id": 1, "code": "DHK", "name": "…" },
    "permissions": ["bb.case.view", "…"],
    "is_super_admin": false,
    "must_change_password": false
  }
}
```

Login errors shown on the form:

| Code                   | Status | Shown as                                  |
| ---------------------- | ------ | ----------------------------------------- |
| `INVALID_CREDENTIALS`  | 401    | Username or password is incorrect         |
| `ACCOUNT_LOCKED`       | 423    | Locked, with the time from `locked_until` |
| `ACCOUNT_INACTIVE`     | 403    | Account deactivated                       |
| `BRANCH_ACCESS_DENIED` | 403    | No access to this branch                  |
| `TOO_MANY_ATTEMPTS`    | 429    | Wait and retry                            |
| `VALIDATION_FAILED`    | 422    | Field errors (e.g. `branch_id`)           |

### Inside the app

- `proxy.ts` redirects to `/login` when the `epic-erp-session` cookie is missing. This is only a convenience; it never validates the session.
- `AuthGate` (in the app shell) loads `useMe()`:
  - `null` → `/login?next=…`
  - `must_change_password` → `/change-password?next=…` (the backend rejects every other route with `403 PASSWORD_CHANGE_REQUIRED` until then)
  - otherwise renders the shell.
- The branch is fixed for the session. There is no switch-branch endpoint; to work in another branch, sign out and sign in again.
- If an admin deactivates the user or the branch, the next request returns 401 and the interceptor sends the user to login.

### Password and sessions

- `/change-password` → `PUT /api/auth/password { current_password, password, password_confirmation }` (204). The backend enforces strength and "not the username"; errors come back as field errors. On success the backend clears `must_change_password` and signs out the user's other sessions; the frontend refetches `Me`.
- Sign out (user menu) → `POST /api/auth/logout`, cache cleared, `/login`.
- Own devices: `GET /api/auth/sessions`, `DELETE /api/auth/sessions/{id}`, `DELETE /api/auth/sessions`. Hooks exist (`useSessions`, `useRevokeSession`, `useRevokeOtherSessions`); the screen is not built yet.

## 5. Access control (RBAC)

The backend decides everything; the frontend only hides what the user can't use.

| Layer         | Mechanism                                                            |
| ------------- | -------------------------------------------------------------------- |
| Sidebar       | Each sub-link has a permission; hidden without it, empty parents too |
| Page          | `<RequirePermission permission=…>` shows a 403 screen                |
| Button        | `<Can permission=…>` / `useCan()` for "create"-type actions          |
| Record action | `record.abilities.cancel` etc., computed by backend Policies         |
| Super admin   | `me.is_super_admin` passes every `useCan` check                      |

Permissions in `Me` apply to the session branch only. Permission names come from each module's `permissions.ts`, copied from the backend enum (`sh.user.*`, `sh.role.*` in Shared; `bb.*` in Blood Bank).

## 6. Features

### Built

| Area                 | Route                             | What it does                                                                                                                                                |
| -------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign in              | `/login`                          | Username → branch lookup → password + branch → session                                                                                                      |
| Change password      | `/change-password`                | Forced after admin reset, or from the user menu                                                                                                             |
| App shell            | all `(app)` routes                | sidebar-07 sidebar (module icons, collapsible sub menus, icon mode with dropdowns), header breadcrumbs, user menu (name, branch, change password, sign out) |
| Dashboard            | `/`                               | Placeholder                                                                                                                                                 |
| Blood Bank: cases    | `/blood-bank/cases`               | Server-paginated list; status filter and search; sort by case no / created; state kept in URL                                                               |
| Blood Bank: new case | `/blood-bank/cases/new`           | Patient search, care type, reason, note, requested components (no duplicates)                                                                               |
| Blood Bank: case     | `/blood-bank/cases/[caseId]`      | Details, components with assigned quantity; Edit and Cancel shown per `abilities`                                                                           |
| Blood Bank: edit     | `/blood-bank/cases/[caseId]/edit` | Edits case details; sends only changed fields (`PATCH`)                                                                                                     |
| Blood Bank: cancel   | button on case detail             | Reason dialog → `POST /cases/{id}/cancel`                                                                                                                   |

### Shared building blocks

| Component / helper             | Use                                                                  |
| ------------------------------ | -------------------------------------------------------------------- |
| `DataTable` + `useListParams`  | Server-side pages; `page`, `per_page`, `sort` and filters in the URL |
| `PatientCombobox`              | Search-as-you-type patient picker; barcode scanners type into it     |
| `ConfirmDialog`                | Status actions without a reason                                      |
| `ReasonDialog`                 | Actions that require a reason (cancel, reprint, amend)               |
| `Form`                         | Every form: Enter moves to the next field, last field submits        |
| `<Money paisa>`                | Integer paisa → `৳1,23,456.78` (en-IN grouping)                      |
| `<DateTime>`                   | ISO string → Asia/Dhaka display                                      |
| `<QueryError>` / `<Forbidden>` | Failed query display; 403 gets its own screen                        |
| `applyServerErrors`            | `VALIDATION_FAILED` → form field errors                              |
| `pickDirty`                    | Only changed fields in `PATCH` bodies                                |
| `safeNextPath`                 | Blocks open redirects after login                                    |

### Not built yet

- Access admin (backend routes exist under `/api/access`): users, activate/deactivate, reset password, unlock, force logout, branch permissions, roles, permission catalog; branches (super admin only).
- My sessions screen.
- Rest of Blood Bank: donors, screening, collections, units, samples, test results, crossmatch, issue/return, storage, consumables, printing (labels, reports).
- Dashboard content and charts.

## 7. CRUD flow (Blood Bank cases as the template)

**List**

1. `/blood-bank/cases` checks `bb.case.view` with `<RequirePermission>`.
2. `<CaseTable>` reads `page`, `per_page`, `sort` (`useListParams`) and `status`, `search` (`useQueryStates`) from the URL. Changing a filter resets the page.
3. `useCases(params)` → `GET /api/blood-bank/cases?filter[status]=open&filter[search]=…&sort=-created_at&include=patient&page=2`. The previous page stays on screen while the next one loads.

**Create**

1. `/blood-bank/cases/new` checks `bb.case.create`.
2. `<CaseCreateForm>` (RHF + Zod) validates shape only; business rules stay on the server.
3. `useCreateCase()` → `POST /api/blood-bank/cases`. `422` → field errors; any other `code` → toast from `error-messages.ts`.
4. On success: invalidate case lists, toast, go to the new case.

**Read**
`useCase(id)` → `GET /api/blood-bank/cases/{id}?include=patient,components.component_type`. 404 → not-found message, 403 → Forbidden screen.

**Update**
Edit button shows only when `case.abilities.update`. The form sends `PATCH` with dirty fields only; on success the list and detail keys are invalidated.

**State change (no deletes)**
Cancel shows only when `case.abilities.cancel`. `ReasonDialog` → `useCancelCase()` → `POST /api/blood-bank/cases/{id}/cancel { reason }`. Domain errors (`CASE_NOT_OPEN`, `CASE_HAS_ISSUED_UNITS`) map to text in `error-messages.ts`.

**Patterns for upcoming screens**

- Versioned records (test results, crossmatches): no edit; "Amend" asks for `amendment_reason` and shows version history.
- Printing: call the print-log endpoint first; on `REPRINT_REASON_REQUIRED` open `ReasonDialog` and retry; print with `react-to-print` only after the log succeeds.
- After a mutation, invalidate every affected key (e.g. issuing a unit touches the unit, its case and unit movements).

## 8. Adding a screen

1. Check the backend: route, Data class (request fields), Resource (response fields), Query (allowed filters/sorts/includes), exceptions (error codes), permission enum.
2. In `modules/{module}/{resource}/`: write `types.ts`, `api.ts`, `queries.ts`, `schemas.ts`, `error-messages.ts`, then `components/`.
3. Add permission names to `permissions.ts` and enum values to `enums.ts` if new.
4. Add pages under `app/(app)/{module}/…`, each wrapped in `<RequirePermission>`.
5. Add the sidebar item to the module's `nav.ts` (new module: register its nav item in `app/(app)/_components/app-frame.tsx`).
6. `npm run typecheck && npm run lint && npm test && npm run build`, then `npm run format`.

## 9. Local setup

```bash
# backend (../backend)
php artisan serve                     # http://localhost:8000

# frontend
cp .env.example .env.local            # API_URL=http://localhost:8000, SESSION_COOKIE=epic-erp-session
npm install
npm run dev                           # http://localhost:3000
```

The backend's `SANCTUM_STATEFUL_DOMAINS` must include `localhost:3000`, and `SESSION_COOKIE` here must match the backend's session cookie name.
