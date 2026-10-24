# Epic Health Care - ERP (Frontend)

Web frontend for the Epic Health Care ERP. It is a **Next.js** application that talks to the Laravel API in [`../backend`](../backend/README.md).

The frontend is organised the same way as the backend: **one app, strict module boundaries**. Every backend module (Blood Bank, Lab, Billing, ...) has a matching frontend module, delivered one at a time. The first module is **Blood Bank**.

The frontend owns **presentation and user experience only**. Business rules, permissions, numbering, totals and validation are enforced by the backend; the frontend repeats some of them only to give faster feedback.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Key Decisions](#key-decisions)
3. [Architecture](#architecture)
4. [Directory Structure](#directory-structure)
5. [Inside a Module](#inside-a-module)
6. [Authentication](#authentication)
7. [Data Fetching](#data-fetching)
8. [Error Handling](#error-handling)
9. [Forms & Validation](#forms--validation)
10. [Tables, Filters & URL State](#tables-filters--url-state)
11. [Permissions in the UI](#permissions-in-the-ui)
12. [Notifications & Confirmations](#notifications--confirmations)
13. [Formatting: Money, Dates, Enums](#formatting-money-dates-enums)
14. [Barcode Scanning & Printing](#barcode-scanning--printing)
15. [Coding Conventions](#coding-conventions)
16. [Getting Started](#getting-started)
17. [Testing & Code Quality](#testing--code-quality)
18. [Adding a New Module](#adding-a-new-module)
19. [Deployment](#deployment)

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI library | React 19 |
| Language | TypeScript (strict) |
| Runtime | Node.js 24 LTS |
| Package manager | pnpm |
| Styling | Tailwind CSS 4 |
| Components | shadcn/ui (Radix primitives), `lucide-react` icons |
| Server state | TanStack Query 5 |
| Tables | TanStack Table 8 (shadcn Data Table pattern) |
| URL state (filters, pagination) | `nuqs` |
| Forms | `react-hook-form` + `@hookform/resolvers` |
| Schema validation | Zod 4 |
| Toasts | Sonner |
| Confirmations | shadcn `AlertDialog` |
| Dates | `date-fns` + `@date-fns/tz` (`Asia/Dhaka`) |
| Authentication | Laravel Sanctum (SPA cookie session), no client auth library |
| Error tracking | Sentry (self-hosted), `@sentry/nextjs` |
| Unit / component tests | Vitest + React Testing Library + MSW |
| End-to-end tests | Playwright |
| Lint / format | ESLint (flat config) + Prettier (`prettier-plugin-tailwindcss`) |

Exact versions are pinned by `pnpm-lock.yaml`.

---

## Key Decisions

### Why no NextAuth / Auth.js

Laravel already owns users, roles, permissions, sessions and the audit log. Adding a JavaScript auth library would create a **second** identity system that has to be kept in sync with the first.

Auth.js (formerly NextAuth) is also now maintained only for security fixes, and its maintainers point new projects to Better Auth. Better Auth expects to own its own user database, which conflicts with Laravel being the single source of truth.

So the frontend uses **Laravel Sanctum's SPA authentication**: a normal Laravel session cookie (stored in Redis), with CSRF protection. Logging out or disabling a user in Laravel takes effect immediately.

### Why Zod (not Yup or Joi)

- TypeScript-first: `z.infer<typeof schema>` gives the form type for free, no duplicate interfaces.
- First-class support in `@hookform/resolvers` and in the shadcn/ui form guides.
- Joi is designed for Node servers and is heavy in the browser. Yup works, but its type inference is weaker.

### Why same-origin (no CORS)

In every environment the browser sees **one origin**:

- `/api/*` and `/sanctum/*` → Laravel
- everything else → Next.js

In development this is done with Next.js rewrites; in production with Nginx. This removes CORS configuration, keeps session cookies first-party, and makes CSRF simple.

### Why client-side data fetching

This is an internal, logged-in, data-heavy tool. Pages are not indexed by search engines and data changes constantly (blood unit availability, request status). So:

- `page.tsx` files are thin **Server Components** that render a module's **Client Component** screen.
- Data is fetched in the browser with TanStack Query against the Laravel API.
- **No Server Actions and no `app/api` route handlers for business logic.** `/api` belongs to Laravel.

---

## Architecture

```
Browser
  → https://erp.<domain>/blood-bank/requests        (Next.js renders the screen)
  → TanStack Query  → fetch('/api/blood-bank/requests', { credentials })
  → Nginx  → Laravel (session cookie + CSRF checked)
  → JSON  → Query cache  → UI
```

### Modules

| Module | Status | Backend module |
|---|---|---|
| Shared | In progress | Shared (Auth, Patient, ...) |
| Blood Bank | In progress | BloodBank |
| Registration & Billing | Planned | Billing |
| Lab (Pathology) | Planned | Lab |
| Radiology (Non-Lab) | Planned | Radiology |
| Report Delivery | Planned | ReportDelivery |
| Accounts / HR / Inventory / OPD / Test Config | Planned | |

### Boundary rules

Enforced with ESLint (`import/no-restricted-paths`). A change that breaks them must not be merged.

1. A module may import another module **only through its `index.ts`** (its public surface), never from its internal folders.
2. `components/ui`, `components/shared`, `lib`, `hooks` and `modules/shared` may be used by every module. Keep them generic: no module-specific logic.
3. `app/` contains **routing only**: layouts, pages, loading and error boundaries. Screens, hooks and API calls live in `modules/`.
4. Server state lives in TanStack Query. Do not copy API data into React state or a global store.

---

## Directory Structure

```
frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root: fonts, <Providers>, <Toaster>
│   │   ├── providers.tsx           # QueryClientProvider, NuqsAdapter, theme
│   │   ├── not-found.tsx
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   └── (app)/                  # Authenticated area
│   │       ├── layout.tsx          # App shell: sidebar, header, auth gate
│   │       ├── error.tsx
│   │       ├── dashboard/page.tsx
│   │       └── blood-bank/
│   │           ├── donors/page.tsx
│   │           ├── donors/[id]/page.tsx
│   │           ├── units/page.tsx
│   │           └── requests/...
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components (generated, owned by us)
│   │   └── shared/                 # DataTable, PageHeader, BarcodeInput, ConfirmDialog, Can, Money
│   ├── modules/
│   │   ├── shared/                 # auth (useMe, login), patient lookup, ...
│   │   └── blood-bank/
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts           # fetch wrapper (CSRF, JSON, ApiError)
│   │   │   ├── errors.ts           # ApiError, applyServerErrors
│   │   │   ├── query-client.ts     # QueryClient defaults + global error handling
│   │   │   └── query-string.ts     # spatie/laravel-query-builder params
│   │   ├── format.ts               # money, dates, phone
│   │   ├── env.ts                  # validated env (Zod)
│   │   └── utils.ts                # cn()
│   ├── hooks/                      # generic hooks (useDebounce, useBarcodeScanner)
│   ├── config/
│   │   └── navigation.ts           # sidebar items + required permission
│   └── proxy.ts                    # Redirect to /login when no session cookie
├── tests/
│   └── e2e/                        # Playwright
├── components.json                 # shadcn/ui config
├── next.config.ts
├── eslint.config.mjs
├── vitest.config.ts
└── playwright.config.ts
```

---

## Inside a Module

```
src/modules/blood-bank/
├── api/
│   ├── keys.ts                 # Query key factory
│   ├── requests.ts             # Plain endpoint functions (no React)
│   ├── queries.ts              # useBloodRequests, useBloodRequest, ...
│   └── mutations.ts            # useCreateBloodRequest, useIssueUnit, ...
├── components/                 # Module components (forms, tables, cards)
├── screens/                    # One component per page: DonorListScreen, ...
├── schemas/                    # Zod schemas for forms
├── types.ts                    # API response types (mirror backend Resources)
├── constants.ts                # Status → badge colour, etc.
└── index.ts                    # Public surface for other modules
```

| Folder | Responsibility | Must not |
|---|---|---|
| `app/**/page.tsx` | Read route params, render one screen | Fetch data, hold logic |
| `screens/` | Compose a page from components and hooks | Call `fetch` directly |
| `components/` | Render UI, emit events | Know about URLs or query keys |
| `api/*.ts` (endpoints) | Build the request, return typed data | Use React hooks |
| `api/queries.ts`, `mutations.ts` | Wrap endpoints in TanStack Query, invalidate caches | Render UI |
| `schemas/` | Client-side validation for forms | Be treated as the source of truth |
| `types.ts` | Shapes of API responses | Contain logic |

A page stays this small:

```tsx
// src/app/(app)/blood-bank/requests/page.tsx
import { BloodRequestListScreen } from '@/modules/blood-bank'

export default function Page() {
  return <BloodRequestListScreen />
}
```

---

## Authentication

### Flow

1. Login screen calls `GET /sanctum/csrf-cookie` (sets `XSRF-TOKEN`).
2. Posts credentials to `POST /api/auth/login`. Laravel starts a session.
3. The app shell calls `GET /api/auth/me` → user, roles and **permission list**. This is cached by TanStack Query as `['auth', 'me']`.
4. Logout calls `POST /api/auth/logout`, then clears the query cache and redirects to `/login`.

### Route protection

- `src/proxy.ts` (Next.js 16 replacement for `middleware.ts`) redirects to `/login?redirect=...` when the session cookie is **missing**. This is only a fast redirect, not a security check.
- The real check is the API: any `401` response clears the cache and redirects to `/login`.
- The `redirect` parameter is accepted only if it starts with a single `/` (prevents open redirects).

### Backend requirements

- Laravel Sanctum installed, `$middleware->statefulApi()` in `bootstrap/app.php`.
- `SANCTUM_STATEFUL_DOMAINS` includes `localhost:3000` (dev) and the production host.
- `SESSION_DRIVER=redis`, `SESSION_COOKIE=erp_session`, `SESSION_SECURE_COOKIE=true` in production.
- `/api/auth/me` returns `permissions: string[]` (from `spatie/laravel-permission`).

---

## Data Fetching

### API client

All requests go through `lib/api/client.ts`:

```ts
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (method !== 'GET') {
    const xsrf = readCookie('XSRF-TOKEN')
    if (xsrf) headers.set('X-XSRF-TOKEN', xsrf)
  }

  const res = await fetch(`/api${path}`, { ...init, headers, credentials: 'include' })
  if (res.status === 204) return undefined as T

  const body = await res.json().catch(() => null)
  if (!res.ok) throw ApiError.from(res.status, body)
  return body as T
}
```

### Query keys

Each module has a key factory so invalidation is predictable:

```ts
export const bloodRequestKeys = {
  all: ['blood-bank', 'requests'] as const,
  lists: () => [...bloodRequestKeys.all, 'list'] as const,
  list: (params: BloodRequestListParams) => [...bloodRequestKeys.lists(), params] as const,
  detail: (id: number) => [...bloodRequestKeys.all, 'detail', id] as const,
}
```

### Rules

- Every read uses `useQuery`; every write uses `useMutation`. No `fetch` inside components.
- Mutations invalidate the narrowest keys they affect (`bloodRequestKeys.lists()`, `detail(id)`).
- Default `staleTime` is 30 seconds. Inventory views (available units) use a shorter `staleTime` and `refetchOnWindowFocus`.
- Safety-critical actions (issuing a unit, crossmatch) are always re-validated by the backend. The UI never assumes its cached data is still true.
- Submit buttons are disabled while a mutation is pending to prevent double submission.
- Keep API keys and types in `snake_case`, exactly as the backend returns them. No camelCase conversion layer.

---

## Error Handling

The backend returns one error shape (see backend README, *API Conventions*). `ApiError` carries `status`, `code`, `message` and `errors`.

| Status / code | Frontend behaviour |
|---|---|
| `401` | Clear query cache, redirect to `/login` |
| `403` | Toast: "You don't have permission for this action" |
| `419` (CSRF expired) | Fetch `/sanctum/csrf-cookie` and retry once |
| `422` `VALIDATION_FAILED` | Errors applied to form fields (see below) |
| Domain codes (`BB_INCOMPATIBLE_UNIT`, ...) | Handled by the feature where meaningful; otherwise toast the `message` |
| `5xx` / network | Toast generic error, report to Sentry |

- **Logic branches on `code`, never on `message`.** The `message` is only displayed.
- Global handling lives in the `QueryCache` / `MutationCache` `onError` in `lib/api/query-client.ts`. A mutation can opt out with `meta: { skipGlobalError: true }` when the screen handles the error itself.
- Route-level crashes are caught by `error.tsx` boundaries and reported to Sentry.

---

## Forms & Validation

- `react-hook-form` + `zodResolver` + shadcn/ui `Field` components with RHF `Controller`.
- Schemas live in the module's `schemas/` folder. Types come from `z.infer`.
- **Form field names use the backend's `snake_case` names.** Laravel's 422 keys (including nested ones like `items.0.unit_id`) then map directly onto RHF field paths.
- The backend is the source of truth. Client validation exists for fast feedback; server errors are always applied back to the form.

```ts
export const createDonorSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  mobile: z.string().regex(/^01[3-9]\d{8}$/, 'Valid Bangladeshi mobile number (01XXXXXXXXX)'),
  blood_group: z.enum(BLOOD_GROUPS),
})
export type CreateDonorInput = z.infer<typeof createDonorSchema>
```

```ts
// lib/api/errors.ts
export function applyServerErrors<T extends FieldValues>(form: UseFormReturn<T>, error: unknown) {
  if (!(error instanceof ApiError) || error.code !== 'VALIDATION_FAILED') return false
  for (const [field, messages] of Object.entries(error.errors ?? {})) {
    form.setError(field as Path<T>, { type: 'server', message: messages[0] })
  }
  return true
}
```

Form UX rules:

- Keyboard-first: logical tab order, `Enter` submits, first invalid field is focused.
- Show required markers and inline errors under each field.
- Reset or navigate after success; never leave a submitted form editable with stale data.

---

## Tables, Filters & URL State

- Lists use TanStack Table with **server-side** pagination, sorting and filtering.
- Filter, sort and page state live in the URL via `nuqs`, so a filtered list can be bookmarked, shared and survives refresh.
- `lib/api/query-string.ts` converts table state to the `spatie/laravel-query-builder` format:

```
{ filter: { status: 'available', blood_group: 'O_POS' }, sort: '-expires_at', include: ['component'], page: 2 }
→ ?filter[status]=available&filter[blood_group]=O_POS&sort=-expires_at&include=component&page=2
```

- Only use filters and sorts the backend explicitly allows; others are rejected with an error.
- Text search inputs are debounced (300 ms).

---

## Permissions in the UI

- Permissions come from `/api/auth/me` and use the backend names (`bb.request.create`, `bb.unit.issue`).
- `usePermission('bb.unit.issue')` returns a boolean; `<Can permission="bb.unit.issue">` hides children.
- Sidebar items in `config/navigation.ts` declare their required permission and are filtered automatically.
- **UI checks only hide controls. The backend Policy is the real check.** Never rely on a hidden button for security.

---

## Notifications & Confirmations

| Need | Use |
|---|---|
| Success / failure feedback | Sonner `toast.success` / `toast.error` |
| Destructive or irreversible action | shadcn `AlertDialog` via `ConfirmDialog` / `useConfirm()` |
| Inline warning on a page | shadcn `Alert` |

Rules:

- Confirmation dialogs for irreversible actions (issue unit, discard unit, cancel request) restate the key identifiers: unit no, blood group, patient name.
- Safety overrides require a **reason** field in the dialog; the reason is sent to the backend for the audit log.
- Do not toast on every successful read. Toast on writes and on errors only.

---

## Formatting: Money, Dates, Enums

All formatting helpers live in `lib/format.ts`. Components never format inline.

- **Money**: the API sends integer **paisa**. `formatTaka(paisa)` formats for display only. Totals and prices are always taken from the API, never calculated in the browser. User-entered amounts are parsed from the string with `toPaisa('125.50')`, not with floating-point multiplication.
- **Dates**: the API sends ISO 8601 with `+06:00`. `formatDate`, `formatDateTime` and `formatRelative` render in `Asia/Dhaka` using `@date-fns/tz`, regardless of the browser's timezone.
- **Enums**: the API sends both `status` and `status_label`. Display `status_label`; use `status` for logic and badge colour (`constants.ts`). Do not duplicate label text in the frontend.
- **Phone**: Bangladeshi numbers displayed as `01XXX-XXXXXX`.

---

## Barcode Scanning & Printing

### Scanning

- USB barcode scanners act as keyboards: they type the code and press `Enter`. No camera library is needed.
- Use the shared `<BarcodeInput>` component: autofocused, submits on `Enter`, trims whitespace, and returns focus after each scan so staff can scan repeatedly.
- Vendor invoice barcodes are sent to the backend as-is; the backend stores them in `sh_external_references`.

### Printing

- PDFs (reports, labels, invoices) are generated by the backend (`mpdf`).
- The frontend requests the PDF with the session cookie, opens it in a new tab or a hidden iframe, and calls `print()`.
- Always call the print endpoint, even for reprints, so the backend can audit-log every print and reprint. Never cache or re-serve PDFs in the browser.

---

## Coding Conventions

### TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`. No `any`; use `unknown` and narrow.
- API response types are written to match backend Resources. Types derived from forms come from `z.infer`.
- Use `as const` arrays and union types for enums (`BLOOD_GROUPS`); no TypeScript `enum`.

### React & Next.js

- Add `'use client'` at the **screen** level, not on every small component.
- Named exports everywhere, except the files Next.js requires to be default exports (`page.tsx`, `layout.tsx`, `error.tsx`, ...).
- No global state library by default. Server state → TanStack Query; filters → URL (`nuqs`); forms → RHF; local UI → `useState`. Add Zustand only for genuinely global client state, and document why.
- Use `next/link` for navigation, `next/font` for fonts (self-hosted at build time).

### Styling

- Tailwind utility classes only; no CSS modules or inline `style` except for dynamic values.
- Tailwind 4 is configured in CSS (`@theme` in `globals.css`); there is no `tailwind.config.js`.
- Merge classes with `cn()`. Class order is fixed by `prettier-plugin-tailwindcss`.
- Fonts: Inter for Latin text and Noto Sans Bengali for Bangla text.
- shadcn/ui components in `components/ui` are our own code. Change them deliberately and keep changes small; put app-specific composition in `components/shared`.

### Naming

| Item | Convention | Example |
|---|---|---|
| Files & folders | kebab-case | `blood-request-form.tsx` |
| Components | PascalCase | `BloodRequestForm` |
| Hooks | `use` + PascalCase | `useIssueUnit` |
| Screens | `...Screen` | `DonorListScreen` |
| Zod schemas | camelCase + `Schema` | `createDonorSchema` |
| Routes (URLs) | kebab-case, match API module | `/blood-bank/requests` |

### Environment variables

- Validated with Zod in `lib/env.ts`; the app fails to start with a clear message if one is missing.
- Only non-secret values use the `NEXT_PUBLIC_` prefix. The frontend holds no secrets.

---

## Getting Started

### Prerequisites

- Node.js 24 LTS, pnpm (`corepack enable`)
- The backend running locally on `http://localhost:8000` (see backend README)

### Setup

```bash
cd diagnostic-erp/frontend
pnpm install
cp .env.example .env.local
```

Configure `.env.local`:

```dotenv
BACKEND_URL=http://localhost:8000
SESSION_COOKIE_NAME=erp_session
NEXT_PUBLIC_APP_NAME="Epic Health Care ERP"
SENTRY_DSN=
```

`next.config.ts` rewrites `/api/*` and `/sanctum/*` to `BACKEND_URL` in development, so the browser sees one origin:

```ts
const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return []
    return [
      { source: '/api/:path*', destination: `${process.env.BACKEND_URL}/api/:path*` },
      { source: '/sanctum/:path*', destination: `${process.env.BACKEND_URL}/sanctum/:path*` },
    ]
  },
}
```

Run:

```bash
pnpm dev            # http://localhost:3000
```

### Scripts

| Script | Purpose |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build / run |
| `pnpm lint` | ESLint (Next.js 16 no longer ships `next lint`) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm format` | Prettier |
| `pnpm test` | Vitest |
| `pnpm test:e2e` | Playwright |

### Adding shadcn/ui components

```bash
pnpm dlx shadcn@latest add button field input select table dialog alert-dialog sonner
```

---

## Testing & Code Quality

### What to test

| Layer | Tool | Focus |
|---|---|---|
| Helpers (`format.ts`, `query-string.ts`, `errors.ts`) | Vitest | Pure functions, edge cases |
| Schemas | Vitest | Valid and invalid inputs |
| Components & screens | Vitest + Testing Library + MSW | Rendering, interaction, server errors mapped to fields |
| Critical flows | Playwright | Login, register donor, create request, crossmatch, issue unit |

### Test rules

- API calls in component tests are mocked with MSW handlers that return the **real backend response shapes**, including error responses.
- E2E tests run against a local backend with seeded test data, never against production or real patient data.

### CI gates

Every pull request must pass: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`. Flows that touch blood compatibility or unit issuing must have a Playwright test.

---

## Adding a New Module

1. Create `src/modules/{module-name}/` with the standard folder layout.
2. Add `types.ts` matching the backend module's Resources.
3. Add the query key factory, endpoint functions, queries and mutations.
4. Build screens and components; export the public surface from `index.ts`.
5. Add routes under `src/app/(app)/{module-name}/`.
6. Add sidebar entries with required permissions in `config/navigation.ts`.
7. Add the module to the ESLint boundary rules.
8. Add MSW handlers and tests; add Playwright tests for critical flows.
9. Update the [Modules](#modules) table in this README.

---

## Deployment

Next.js is built as a standalone Node server and runs behind the same Nginx as Laravel.

```nginx
server {
    server_name erp.<domain>;
    root /var/www/diagnostic-erp/backend/public;

    # Laravel: API and Sanctum
    location ~ ^/(api|sanctum)/ {
        try_files $uri /index.php?$query_string;
    }
    location = /index.php {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $realpath_root/index.php;
        fastcgi_pass unix:/run/php/php8.4-fpm.sock;
    }

    # Everything else: Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Checklist

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm build`
- [ ] Copy `public/` and `.next/static/` into `.next/standalone/`
- [ ] Restart the Node process (Supervisor, same as Horizon) running `node .next/standalone/server.js`
- [ ] Smoke test: login, open Blood Bank, print one PDF
- [ ] Check Sentry after deploy

### Maintenance

- Next.js publishes scheduled security releases. Apply security patches promptly.
- Run `pnpm outdated` monthly; upgrade one major dependency at a time on its own branch.

---

## License

Proprietary. Internal use only.
