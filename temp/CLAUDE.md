# Epic Health Care ERP (backend)

Modular-monolith ERP for a diagnostic center, built to gradually replace a subscription vendor system. Laravel 13, PHP 8.4, PostgreSQL 18, Redis. Full detail is in `README.md`; the first module's scope is in `docs/features/blood abank/brief.md`, its plan in `docs/features/blood abank/plan.md`, and the table-by-table data flow in `modules/BloodBank/workflow.md` (keep it in sync when Blood Bank tables change).

## Architecture

- Business code lives in `modules/{Name}/` (PSR-4 `Modules\`), not `app/`. `app/` is bootstrap only.
- Modules: `Shared` (kernel: Auth, RBAC, Audit, Patient, Doctor, TestCatalog, Billing, Printing, Numbering, ExternalReference, Notification, Support) and `BloodBank` (in progress). Others are planned.
- Capabilities every module needs (e.g. print logs) belong in `Shared` behind a contract, not copied per module.
- Polymorphic columns store morph aliases (`bb.sample`, `bb.unit`), never class names. Each module registers its aliases with `Relation::morphMap()` in its service provider (non-enforcing).
- Module layout: `Actions`, `Contracts`, `Data`, `Database/{Factories,Migrations,Seeders}`, `Enums`, `Events`, `Exceptions`, `Http/{Controllers,Middleware,Resources}`, `Jobs`, `Listeners`, `Models`, `Policies`, `Providers`, `Queries`, `Resources/views`, `Routes/api.php`, `Services`, `Tests/{Feature,Unit}`.
- Module providers are registered in `bootstrap/providers.php`.

### Boundary rules (enforced by arch tests; do not break)

1. A module owns its tables; no other module writes to them.
2. Never import another module's `Models`. Use its `Contracts` or domain events.
3. Only `Shared` may be used freely by all modules; keep it small.
4. Cross-module reporting uses DB views or read models, not ad-hoc joins.

## Request flow and conventions

Route → Controller → Data object (laravel-data validates) → permission check → `Action::handle(Data)` → `DB::transaction` → Resource.

- Routes are module-specific: define them in `modules/{Name}/Routes/api.php` (loaded by the module's service provider), never in the global `routes/` files (those are for global routes like the health check only).
- Controllers: very thin. Each controller method calls exactly one Action (or Query) for one specific task and returns a Resource. No business logic, queries, or transactions.
- Actions: `final`, named verb+noun (`IssueBloodUnit`), one specific task each. The only public method is `handle()`; it may delegate to as many private methods as needed. Actions own the transaction. An Action may call another Action.
- Dependency injection: always via the constructor (promoted properties). Do not resolve dependencies with `app()`, facades-as-locators, or method-level `new` for injectable classes.
- Services: commonly reusable functionality shared across Actions (or modules via `Contracts`). Actions call Services. A Service is not a user-facing use case. External providers (SMS, WhatsApp, LIS) go behind an interface in `Contracts/` and are faked in tests.
- Data: extend `Spatie\LaravelData\Data` with `#[MapName(SnakeCaseMapper::class)]`; validation lives here; `Optional|type` for partial updates. Never pass raw request arrays to Actions.
- Queries: read side only, using `spatie/laravel-query-builder` with explicit allowed filters, sorts and includes.
- Events after a DB write implement `ShouldDispatchAfterCommit`. Each side effect is its own queued listener declaring `$queue`, `$tries`, `$backoff`.
- `final` classes by default. PHP Enums for every status/type/category, cast on the model; no magic strings.
- No generic repository layer; use Eloquent directly.
- `env()` only inside `config/`.
- Money is integer paisa (`bigint`), never float. Totals are always computed server-side.
- Timezone is `Asia/Dhaka`. `Model::shouldBeStrict()` is on outside production.

## API

- Path: `/api/{module}/{resource}` (e.g. `/api/blood-bank/requests`); JSON keys `snake_case`; dates ISO 8601.
- Success: `{"data": ...}`; collections add `meta`.
- Errors are rendered centrally in `bootstrap/app.php` as `{"message", "code"}`; validation errors use `code: VALIDATION_FAILED` plus `errors`. Domain exceptions extend `Modules\Shared\Support\Exceptions\DomainException` and define `errorCode()` and `status()`. The frontend reacts to `code`, not `message`.

## Database

- Table prefix per module: `sh_` (Shared), `bb_` (Blood Bank), `lab_`, `bill_`.
- Use `timestampsTz()`/`timestampTz()`; always declare foreign key constraints.
- `jsonb` only for snapshots/metadata, not regularly queried data.
- No hard deletes of business records: soft delete or status change.
- Medical results/reports are versioned: an amendment creates a new version with a reason, keeping the old one.
- Human-facing numbers (invoice, request, unit no) come from the Shared Numbering service, never auto-increment IDs.

## Audit and access

- Every create/update/delete is audit-logged (actor, action, entity, old/new values, IP, user agent). Also log logins, failed logins, report print/reprint, exports, and safety overrides (reason mandatory). The audit log is append-only.
- Prints and reprints are recorded through the Shared `Modules\Shared\Printing\Contracts\PrintLogger` into `sh_print_logs`; it decides `is_reprint` and rejects a reprint without a reason (`REPRINT_REASON_REQUIRED`). Each module owns its printable document types as a backed enum with module-prefixed values (`bb.sample_label`) and decides who may reprint (permission + Policy).
- Access is branch first, then permission. Permissions are granular per action (e.g. `bb.request.create`) and granted per user per branch (`sh_user_branch_permissions`); the session holds the branch chosen at login (`Modules\Shared\Branch\Contracts\CurrentBranch`). Check with `can:` / Gate (routed through `Modules\Shared\Rbac\Contracts\AccessChecker`); records with a `branch_id` must also pass `AccessChecker::allowsOnRecord()` in their Policy. Roles are UI templates only and never grant access. Super admin is IT/Developer only, set via `php artisan auth:super-admin`, never through the API.
- Each module declares permissions as a backed enum implementing `PermissionDefinition`, registers it with `PermissionRegistry` in its provider, and `php artisan permissions:sync` mirrors them into `sh_permissions`.
- Branch-owned business tables carry `branch_id`, stamped from `CurrentBranch` on create.

## Testing

- Only write tests that protect business rules or behavior: Actions, Services, Policies, domain exceptions, API contracts (status, `code`, response shape), and bugs being fixed.
- Do not write tests for schema or framework behavior: migrations/tables existing, factories persisting, casts, Eloquent relationships, or DB constraints, unless a business rule depends on them and nothing else covers it.
- Do not add tests for every change by default; one focused test per rule beats many overlapping ones. If unsure whether a test is worth it, ask.

## Commands

- Tests: `php artisan test --compact` (Pest; feature, unit, `tests/Arch`)
- Static analysis: `./vendor/bin/phpstan analyse` (Larastan)
- Style: `vendor/bin/pint --dirty --format agent`
- Dev: `php artisan serve`, `php artisan horizon`, `php artisan schedule:work`

## Adding a module

Create `modules/{Name}/` with the standard layout, add a `{Name}ServiceProvider` and register it in `bootstrap/providers.php`, pick a table prefix, define `Contracts` first, seed permissions, add arch tests, and update the README module table.

<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

## Foundational Context

This application is a Laravel application running on PHP 8.4. Always use the APIs that match the installed major version of each package — do not assume a version.

Before relying on a package's API, confirm its installed version:
- PHP packages: run `composer show --direct` to list direct dependencies with versions, or `composer show <vendor/package>` for a single package.
- JS packages: check `package.json` for the installed versions.

## Skills Activation

This project has domain-specific skills available in `**/skills/**`. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If a frontend change doesn't show in the UI or you get a "Unable to locate file in Vite manifest" error, run `npm run build` or ask the user to run `npm run dev` or `composer run dev`.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

=== boost rules ===

# Laravel Boost

## Tools

- Laravel Boost is an MCP server with tools designed specifically for this application. Prefer Boost tools over manual alternatives like shell commands or file reads.
- Use `database-query` to run read-only queries against the database instead of writing raw SQL in tinker.
- Use `database-schema` to inspect table structure before writing migrations or models.
- Use `get-absolute-url` to resolve the correct scheme, domain, and port for project URLs. Always use this before sharing a URL with the user.
- Use `browser-logs` to read browser logs, errors, and exceptions. Only recent logs are useful, ignore old entries.

## Searching Documentation (IMPORTANT)

- Use `search-docs` before changes that depend on Laravel ecosystem APIs, behavior, configuration, or version-specific syntax. Skip it for copy-only edits and other changes where package documentation is irrelevant. Reuse sufficient results already in context instead of searching again.
- Pass a `packages` array to scope results when you know which packages are relevant.
- Use multiple broad, topic-based queries: `['rate limiting', 'routing rate limiting', 'routing']`. Expect the most relevant results first.
- Do not add package names to queries because package info is already shared. Use `test resource table`, not `filament 4 test resource table`.

### Search Syntax

1. Use words for auto-stemmed AND logic: `rate limit` matches both "rate" AND "limit".
2. Use `"quoted phrases"` for exact position matching: `"infinite scroll"` requires adjacent words in order.
3. Combine words and phrases for mixed queries: `middleware "rate limit"`.
4. Use multiple queries for OR logic: `queries=["authentication", "middleware"]`.

## Project Rules

- This project contains committed, area-grouped rules in `.ai/rules` when that directory exists, including path-scoped framework guidelines under `.ai/rules/boost`. Before you enter plan mode or create/edit any file, you MUST first: open @.ai/rules/index.md (it maps file globs to rule files), read every rule file whose globs cover the path(s) in scope, and run `grep -rin 'keyword' .ai/rules` to catch what a path match alone misses. Do not write code until you have read and are following every matching rule. If `.ai/rules` does not exist, continue without it.

## Artisan

- Run Artisan commands directly via the command line (e.g., `php artisan route:list`). Use `php artisan list` to discover available commands and `php artisan [command] --help` to check parameters.
- Inspect routes with `php artisan route:list`. Filter with: `--method=GET`, `--name=users`, `--path=api`, `--except-vendor`, `--only-vendor`.
- Read configuration values using dot notation: `php artisan config:show app.name`, `php artisan config:show database.default`. Or read config files directly from the `config/` directory.

## Tinker

- Execute PHP in app context for debugging and testing code. Do not create models without user approval, prefer tests with factories instead. Prefer existing Artisan commands over custom tinker code.
- Always use single quotes to prevent shell expansion: `php artisan tinker --execute 'Your::code();'`
  - Double quotes for PHP strings inside: `php artisan tinker --execute 'User::where("active", true)->count();'`

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.
- Use PHP 8 constructor property promotion: `public function __construct(public GitHub $github) { }`. Do not leave empty zero-parameter `__construct()` methods unless the constructor is private.
- Use explicit return type declarations and type hints for all method parameters: `function isAccessible(User $user, ?string $path = null): bool`
- Use TitleCase for Enum keys: `FavoritePerson`, `BestLake`, `Monthly`.
- Prefer PHPDoc blocks over inline comments. Only add inline comments for exceptionally complex logic.
- Use array shape type definitions in PHPDoc blocks.

=== deployments rules ===

# Deployment

- Laravel can be deployed using [Laravel Cloud](https://cloud.laravel.com/), which is the fastest way to deploy and scale production Laravel applications.
- Activate the `deploying-to-cloud` skill whenever deploying to Laravel Cloud, configuring Cloud environments or resources, using the Cloud CLI, or troubleshooting Cloud deployments.

=== tests rules ===

# Test Enforcement

- Add or update tests for behavior and logic changes when a test provides meaningful regression coverage.
- Pure copy, styling, and layout-only changes do not require new or updated tests.
- When test coverage applies, run the affected tests and ensure they pass.
- Test the changed behavior and its important failure modes, but do not add tests beyond them.
- Read the `testing-best-practices` skill before writing tests.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `php artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using `php artisan list` and check their parameters with `php artisan [command] --help`.
- If you're creating a generic PHP class, use `php artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `php artisan make:model --help` to check the available options.

## APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `php artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

=== pint/core rules ===

# Laravel Pint Code Formatter

- If you have modified any PHP files, you must run `vendor/bin/pint --dirty --format agent` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/pint --test --format agent`, simply run `vendor/bin/pint --format agent` to fix any formatting issues.

=== pest/core rules ===

# Pest

- This project uses Pest. Create tests with `php artisan make:test --pest {name}`.
- Do not include the test suite directory in `{name}`. Use `SomeFeatureTest`, not `Feature/SomeFeatureTest`.
- Read the `testing-best-practices` skill for guidance on coverage, naming, structure, dependency isolation, and review.
- Do not delete tests or test files without approval. They are part of the application.

## Running Tests

- Run the narrowest set of tests that covers the change. Pass a file path or `--filter=testName` to `php artisan test --compact`.
- Rerun a test after each change to it.
- Run `vendor/bin/pest` to call the test runner directly. It accepts the same file path and `--filter=testName` arguments.
- After the feature tests pass, ask the user to run the complete suite with `php artisan test --compact`.

</laravel-boost-guidelines>
