# RESIDENZA — ARGON 4 ARCHITECTURE VALIDATION & DECISIONS

> **Document Role**: Formal Architecture Review of all initial product, technology, and business decisions, plus resolution of the 14 architectural validation responsibilities and documentation of Open Decisions.
> **Reviewer**: Argon 4 (Lead Software Architect, Technical Director, and Architecture Reviewer)
> **Date**: 2026-11-08

---

## 1. Decision-by-Decision Validation Matrix

### 1.1 Technology Stack Decisions

#### D-01: Frontend Framework — Next.js 15 + React 19 + TypeScript
- **Original Decision**: Frontend built with Next.js 15, UI with React 19, Language TypeScript.
- **Validation Status**: **APPROVED WITH MODIFICATIONS**
- **Technical Reasoning**: Next.js 15 (App Router) with React 19 and strict TypeScript is an industry-standard choice for a real estate marketplace because public property listings (`(public)`) benefit from Server-Side Rendering (SSR) / Incremental Static Regeneration (ISR) for Arabic SEO and social sharing (WhatsApp OpenGraph previews), while the User Portal (`(portal)`) and Admin Panel (`(admin)`) operate smoothly as authenticated client-rendered views.
- **Recommended Modification**:
  1. Explicitly separate Next.js route groups into `(public)` (Server Components fetching public API routes) and `(portal)` / `(admin)` (Client-authenticated route groups using Sanctum session cookies).
  2. Disable Next.js aggressive fetch caching (`cache: 'no-store'` or short revalidation) on property listing pages during MVP so moderation approvals and availability changes reflect immediately.
- **Consequences of Changing It**: Without explicit SSR vs. CSR boundary rules, developers frequently break Sanctum cookie forwarding inside Next.js Server Components or serve stale moderation states.

#### D-02: Styling & Interface — Tailwind CSS v4 + Arabic-First RTL
- **Original Decision**: Tailwind CSS v4; Interface Arabic-first, RTL.
- **Validation Status**: **APPROVED WITH MODIFICATIONS**
- **Technical Reasoning**: Tailwind CSS v4 provides native CSS-first configuration (`@import "tailwindcss";`) and first-class logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`), eliminating legacy RTL plugin overhead.
- **Recommended Modification**:
  1. Enforce `dir="rtl"` and `lang="ar"` at the root `<html>` element in `frontend/src/app/layout.tsx`.
  2. Prohibit physical directional classes (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right`) across all components in favor of logical properties.
  3. Standardize on an Arabic web font optimized for UI legibility (`Cairo` or `Readex Pro` via `next/font/google`) and format all prices in Egyptian Pounds (`ج.م`) with standard Western Arabic numerals (`0-9`) for clarity in financial figures.
- **Consequences of Changing It**: Mixing physical directional classes in an RTL interface causes broken layouts and misaligned icons across forms and galleries.

#### D-03: Backend Framework & Runtime — Laravel 12 + PHP 8.2+
- **Original Decision**: Backend Laravel 12, PHP 8.2+.
- **Validation Status**: **APPROVED**
- **Technical Reasoning**: The host machine runs **PHP 8.3.31** and **Composer 2.10.2**, which natively satisfies Laravel 12's requirements (`^8.2`). Laravel 12 provides built-in FormRequest validation, Policies, Eloquent ORM, rate limiting, and filesystem abstraction (`public` vs `local`/`private` disks) ideal for a moderated marketplace MVP.
- **Recommended Modification**: Enable the existing `pdo_pgsql`, `pgsql`, `gd`, `exif`, and `intl` extensions in the host's `php.ini` before running backend commands.
- **Consequences of Changing It**: None; keeping Laravel 12 maximizes developer velocity and security defaults.

#### D-04: Database — PostgreSQL
- **Original Decision**: PostgreSQL as the primary relational database.
- **Validation Status**: **APPROVED WITH MODIFICATIONS**
- **Technical Reasoning**: PostgreSQL 15+ is superior for real estate marketplaces due to strict `CHECK` constraints (`price_egp > 0`, `area_sqm > 0`), transactional DDL migrations, composite B-Tree indexing, and future PostGIS spatial extensibility without needing external search engines in the MVP.
- **Recommended Modification**:
  1. Host inspection revealed `php_pdo_pgsql.dll` is not yet uncommented in `php.ini` and the local `bio-pgsql` service is stopped. In Phase 1, enable `pdo_pgsql` + `pgsql` in `php.ini` and connect to a running local PostgreSQL database.
  2. Strictly prohibit raw database-specific SQL in application code so Eloquent migrations run identically on PostgreSQL (production/dev) and SQLite (if ever used in isolated CI unit tests).
- **Consequences of Changing It**: Attempting to run `php artisan migrate` on PostgreSQL before enabling `pdo_pgsql` in `php.ini` will throw a `could not find driver` exception.

#### D-05: Authentication — Laravel Sanctum
- **Original Decision**: Laravel Sanctum for authentication.
- **Validation Status**: **APPROVED WITH MODIFICATIONS**
- **Technical Reasoning**: Laravel Sanctum supports two distinct modes: (1) Stateful SPA cookie authentication and (2) Stateless API bearer tokens. With Next.js 15 and Laravel 12 running as separate processes (`localhost:3000` and `localhost:8000`), misconfiguring Sanctum is the #1 cause of CORS and `419 Page Expired` CSRF bugs.
- **Recommended Modification**:
  1. Lock **Sanctum Stateful SPA Cookie Authentication** (`HttpOnly` session cookie + `XSRF-TOKEN` cookie) as the primary browser authentication mode so tokens are never exposed in `localStorage`.
  2. Enforce `supports_credentials => true` in `config/cors.php`, explicit `SANCTUM_STATEFUL_DOMAINS=localhost:3000,localhost:8000,localhost`, and require both frontend and backend in local development to use `localhost` (never mixing `127.0.0.1` and `localhost`).
- **Consequences of Changing It**: Storing bearer tokens in `localStorage` exposes user and admin accounts to token theft if any XSS vector occurs; conversely, using SPA cookies without matching `SESSION_DOMAIN` and `credentials: 'include'` causes every authenticated request to fail with `401`/`419`.

#### D-06: Architecture & API — Modular Monolith + REST API (`/api/v1/`)
- **Original Decision**: Modular Monolith architecture; REST API versioned under `/api/v1/`.
- **Validation Status**: **APPROVED WITH MODIFICATIONS**
- **Technical Reasoning**: A Modular Monolith gives clean domain boundaries (`Auth`, `User`, `Taxonomy`, `Property`, `Moderation`, `Media`) inside a single deployable Laravel 12 codebase without the distributed-systems overhead of microservices. Versioning under `/api/v1/` protects future mobile or ecosystem expansions.
- **Recommended Modification**:
  1. Organize domain logic under `backend/app/Modules/{ModuleName}/{Controllers,Requests,Models,Resources,Services,Policies}` rather than dumping all files into flat default folders.
  2. Enforce a single unified JSON response envelope (`{ success, message, data, meta, errors, error_code }`) across all `/api/v1/*` endpoints.
- **Consequences of Changing It**: Without module boundaries and a unified response contract, frontend TypeScript error handling becomes fragmented and brittle.

---

### 1.2 Product Architecture & Repository Structure Decisions

#### D-07: Unified Web Platform (Public Marketplace + User Portal + Admin Panel)
- **Original Decision**: One unified web platform with centralized backend, public marketplace, user submission portal, lightweight admin panel, strict moderation, and admin-created + user-submitted properties.
- **Validation Status**: **APPROVED WITH MODIFICATIONS**
- **Technical Reasoning**: Housing the Public Marketplace, User Portal, and Admin Panel inside one Next.js 15 application backed by one Laravel 12 API eliminates multi-app deployment complexity and allows shared UI primitives, RTL styles, and TypeScript types.
- **Recommended Modification**:
  1. Use a **Single Monorepo with Separate Root `/backend` and `/frontend` Directories** (`d:\resdinza v2\backend` and `d:\resdinza v2\frontend`).
  2. Enforce route-level and API-level isolation between `(public)`, `(portal)`, and `(admin)`.
- **Consequences of Changing It**: Mixing Laravel and Next.js files in the same root directory pollutes `package.json`/tooling configs; splitting into two separate Git repositories creates version drift between API contracts and frontend types.

---

### 1.3 Business Rules & MVP Scope Decisions

#### D-08: Multi-Actor Registration (Individuals, Brokers, Companies)
- **Original Decision**: Individuals, companies, and brokers can register and submit properties.
- **Validation Status**: **APPROVED WITH MODIFICATIONS**
- **Technical Reasoning**: Essential for the Sohag real estate market where listings come from private owners (`أفراد`), independent brokers (`سماسرة`), and development/brokerage companies (`شركات عقارية`).
- **Recommended Modification**: Separate **authorization role** (`users.role`: `'user'` vs `'admin'`) from **business account type** (`users.account_type`: `'individual'`, `'broker'`, `'company'`, `'admin'`). This prevents privilege escalation while allowing tailored badges on public listings (e.g., `المعلن: مالك العقار` vs `وسيط عقاري` vs `شركة عقارية`).
- **Consequences of Changing It**: Conflating `role` and `account_type` into a single column complicates authorization policies when all three non-admin types share submission capabilities.

#### D-09: Strict Moderation & Self-Approval Prohibition
- **Original Decision**: User-submitted properties must be approved before public publication; users cannot approve their own submissions; administrators control publication and moderation.
- **Validation Status**: **APPROVED WITH MODIFICATIONS**
- **Technical Reasoning**: Prevents spam, fraudulent pricing, and unverified content on the marketplace.
- **Recommended Modification**:
  1. Enforce `$property->user_id !== $admin->id` inside `ModerationService::approve()` for user-submitted properties.
  2. Enforce automatic moderation reset (`approved` -> `pending_review`) whenever a non-admin owner edits content fields or uploads new images on an already-approved property.
  3. See **Open Decision OD-01** regarding whether Admin-authored properties inside the Admin Panel publish directly or require a second Admin.
- **Consequences of Changing It**: Allowing post-approval edits without re-moderation lets malicious users get a clean listing approved and then swap the text/images for prohibited content.

#### D-10: Independence of Property Availability from Moderation Status
- **Original Decision**: Property availability must be independent from moderation status.
- **Validation Status**: **APPROVED**
- **Technical Reasoning**: Modeling `moderation_status` (`draft`, `pending_review`, `changes_requested`, `approved`, `rejected`) and `availability_status` (`available`, `sold`, `rented`, `hidden`) as two orthogonal state columns allows an owner to mark an approved property as `sold`, `rented`, or `hidden` (and back to `available`) via a dedicated endpoint (`PATCH /api/v1/portal/properties/{id}/availability`) without triggering re-moderation.
- **Recommended Modification**: Dedicate a separate controller action and FormRequest strictly for `availability_status` so owners can toggle availability instantaneously without touching content fields.
- **Consequences of Changing It**: Merging availability and moderation into a single `status` column causes a property marked `hidden` and then `available` to lose its prior moderation history or bypass moderation checks.

#### D-11: Private Document Isolation & Honest Verification Labels
- **Original Decision**: Private documents must never become publicly accessible; verification labels must not imply legal ownership verification unless actual verification procedures exist.
- **Validation Status**: **APPROVED WITH MODIFICATIONS**
- **Technical Reasoning**: Storing national IDs, power-of-attorney (`توكيل`), or ownership contracts in `storage/app/public` is a severe data-exposure vulnerability. Similarly, displaying "Legally Verified Ownership" (`ملكية موثقة`) without legal registry integration creates legal liability.
- **Recommended Modification**:
  1. Store all `property_documents` on a dedicated non-public disk (`storage/app/private`) with UUID filenames and stream them only through an authenticated, policy-guarded controller endpoint (`GET /api/v1/documents/{id}/download`).
  2. Standardize the public badge text strictly to **"معتمد للنشر" (Approved for Publication)**.
- **Consequences of Changing It**: Any public URL or unguarded static path for verification documents risks leaking sensitive citizen/company documents.

#### D-12: MVP Scope & Infrastructure Restraint
- **Original Decision**: Strictly limit scope to Public Marketplace, User Portal, and Admin Panel; exclude CRM, payments, subscriptions, commissions, AI matching, advanced analytics, Deal Room, mobile apps, and microservices. Do not add Redis, Meilisearch, or Kubernetes unless necessary now.
- **Validation Status**: **APPROVED**
- **Technical Reasoning**: For an initial city/governorate launch in Sohag (hundreds to tens of thousands of listings), PostgreSQL composite B-Tree indexes handle filtering (`category_id`, `location_id`, `transaction_type`, `price_egp`, `area_sqm`, `bedrooms`) in `< 15ms`. Database-backed sessions and cache (`SESSION_DRIVER=database`, `CACHE_STORE=database`) eliminate the need for Redis or Meilisearch in the MVP.
- **Recommended Modification**: None. Strictly locked.
- **Consequences of Changing It**: Introducing Redis, Meilisearch, or microservices now increases hosting cost, deployment failure points, and local setup friction with zero user-visible benefit at MVP scale.

---

## 2. Evaluation of the 14 Architectural Responsibilities

| # | Responsibility | Architectural Resolution |
| :--- | :--- | :--- |
| **1** | **Stack Compatibility** | Next.js 15 + React 19 + Tailwind v4 (`frontend`) and Laravel 12 + PHP 8.3 + PostgreSQL (`backend`) are 100% compatible when decoupled over REST `/api/v1/` in a split-directory monorepo. |
| **2** | **Architecture Suitability** | A Modular Monolith provides strict internal domain boundaries (`Auth`, `User`, `Taxonomy`, `Property`, `Moderation`, `Media`) with single-server operational simplicity. |
| **3** | **Monorepo vs. Separate Directories** | **Single Git repository with `/backend` and `/frontend` root directories** is selected. It keeps atomic commits across API + UI and centralized `.ai/` governance while isolating Composer and npm dependency trees. |
| **4** | **Sanctum Authentication Setup** | Configured in **Stateful SPA Cookie Mode**. Browser authenticates via `/sanctum/csrf-cookie` + `/api/v1/auth/login` using `HttpOnly` session cookies; zero tokens stored in `localStorage`. |
| **5** | **CORS, Cookies, Sessions, CSRF** | `supports_credentials: true`, explicit `FRONTEND_URL` origin (`http://localhost:3000`), `SESSION_DOMAIN=localhost`, `SameSite=Lax`, and automatic `X-XSRF-TOKEN` header forwarding in the frontend API client. |
| **6** | **Database Entities & Relationships** | 7 normalized PostgreSQL tables: `users`, `categories`, `locations` (self-referencing parent/child for Sohag cities & districts), `properties`, `property_images`, `property_documents`, and `moderation_logs`. |
| **7** | **User Roles & Authorization Policies** | Two-tier model: `role` (`user`, `admin`) controls system permissions via Laravel Policies (`PropertyPolicy`, `PropertyDocumentPolicy`) and middleware (`EnsureUserIsAdmin`, `EnsureUserIsActive`), while `account_type` (`individual`, `broker`, `company`) captures marketplace identity. |
| **8** | **Property Ownership & Submission Rules** | `properties.user_id` binds ownership. Only the owner (or Admin) can view/edit a non-approved listing. Content edits by non-admin owners on approved listings automatically reset `moderation_status` to `pending_review`. |
| **9** | **Moderation State Machine** | States: `draft`, `pending_review`, `changes_requested`, `approved`, `rejected`. All transitions are validated by `ModerationService`, require feedback notes on rejection/change-request, forbid self-approval on user submissions, and write an immutable row to `moderation_logs`. |
| **10** | **Image Upload & Storage Security** | Public images (`jpg/png/webp`, <= 5 MB) stored on `public` disk with UUID filenames and `finfo` MIME validation. Private documents (`pdf/jpg/png/webp`, <= 10 MB) stored on `private` disk (`storage/app/private`) outside webroot and streamed via policy-protected endpoint. |
| **11** | **Public / Private Data Separation** | Dedicated Eloquent API Resources: `PublicPropertyResource` (strips `user_id`, `reviewed_by`, `rejection_reason`, `moderation_logs`, and `property_documents`) vs. `PortalPropertyResource` and `AdminPropertyResource`. |
| **12** | **API Structure & Error Handling** | Versioned under `/api/v1/{public,auth,portal,admin}`. Global exception handler in `bootstrap/app.php` renders consistent JSON envelopes (`{ success, message, data, errors, error_code }`) for `401`, `403`, `404`, `422`, and `500`. |
| **13** | **Performance & Deployment** | Composite PostgreSQL indexes on `(moderation_status, availability_status, transaction_type, category_id, location_id, published_at DESC)`; eager loading (`with(['category', 'location', 'primaryImage'])`) to prevent N+1 queries; server-side pagination (12 items/page). |
| **14** | **Security Risks & Scalability** | Mitigated IDOR (via Policies), Privilege Escalation (role locked out of registration payload), Post-Approval Bait-and-Switch (edit resets moderation), Private Document Leakage (private disk + auth streaming), and XSS token theft (HttpOnly cookies). |

---

## 3. Identified Risks & Mitigations

1. **Risk R-01 — Host PHP Extensions Disabled (`pdo_pgsql`, `gd`, `exif`, `intl`)**:
   - *Finding*: `php -m` showed `pdo_pgsql`, `pgsql`, `gd`, `exif`, and `intl` are not currently active in `php.ini`, though their `.dll` files exist in the PHP `ext` directory.
   - *Mitigation*: Included explicit step in Phase 1 handoff (`ARGON_TO_FLASH.md`) to enable these extensions in `php.ini` and verify with `php -m`.
2. **Risk R-02 — Local PostgreSQL Service State**:
   - *Finding*: No PostgreSQL server is currently listening on port `5432` (only a stopped `bio-pgsql` service from ZKBioTime was found).
   - *Mitigation*: Flagged in **Open Decision OD-04** so the user can either start/provide their PostgreSQL instance credentials or authorize starting a local PostgreSQL service before running migrations.
3. **Risk R-03 — PowerShell Execution Policy Blocking `npm.ps1`**:
   - *Finding*: Calling `npm` in PowerShell fails because `.ps1` scripts are disabled by Windows ExecutionPolicy, whereas `npm.cmd` and `npx.cmd` succeed cleanly.
   - *Mitigation*: Mandated using `npm.cmd` and `npx.cmd` in all Windows PowerShell commands across `.ai/ARGON_TO_FLASH.md`.
4. **Risk R-04 — Next.js SSR Cookie Forwarding Pitfalls**:
   - *Finding*: Next.js Server Components do not automatically forward browser cookies to external APIs unless manually wired, which often causes confusion between public and authenticated routes.
   - *Mitigation*: Public Marketplace routes (`(public)`) call anonymous `/api/v1/properties` endpoints (no cookies required), while authenticated `(portal)` and `(admin)` pages use the browser-side Sanctum fetch client with `credentials: 'include'`.

---

## 4. Open Decisions (Resolved by Product Owner on 2026-11-08)

All 4 Phase 0 Open Decisions were reviewed and locked by the Product Owner prior to Phase 1 execution:

- **OD-01 (Admin Direct Publishing vs. Two-Admin Approval)** — **RESOLVED & LOCKED**:
  - *Decision*: **Admin listings created directly in the Admin Panel publish immediately (audited as `admin_direct_publish`); User Portal listings strictly require a different Admin (`reviewer_id != user_id`) to approve.**
- **OD-02 (Private Document Upload Requirement)** — **RESOLVED & LOCKED**:
  - *Decision*: **Optional during initial submission; Admin can request documents via `changes_requested` if needed.**
- **OD-03 (Behavior of `sold` and `rented` Properties in Public Search)** — **RESOLVED & LOCKED**:
  - *Decision*: **Hide immediately from public marketplace search (remains visible in the owner's portal & admin panel).**
- **OD-04 (Local Database Setup for Phase 1–6 Development)** — **RESOLVED & LOCKED**:
  - *Decision*: **Use SQLite temporarily for local development & automated tests (`database/database.sqlite` & `:memory:`), while keeping 100% PostgreSQL-compatible Eloquent migrations so the system switches seamlessly to PostgreSQL once credentials are provided.**

---

## 5. Phase 1 & Phase 2 Foundation Technical Decisions (2026-11-09)

- **TD-01 (`property_documents.disk` Default Value)**:
  - *Decision*: Standardized default `disk` value on `property_documents` to `'private'` (mapped in `config/filesystems.php` to `storage_path('app/private')` with `'visibility' => 'private'`).
- **TD-02 (`App\Models\User` Compatibility & Factory Alignment)**:
  - *Decision*: Retain `App\Models\User` for Laravel framework/Sanctum/Factory defaults and update `Database\Factories\UserFactory` in Task `FND-02` to match the custom `users` table schema (`phone`, `whatsapp_number`, `role`, `account_type`, `company_name`, `status` — removing `email_verified_at`).
- **TD-03 (Documented Deployment Domain & Cookie Assumptions)**:
  - *Assumption & Lock*:
    1. **Local Development**: Frontend runs at `http://localhost:3000` and Backend runs at `http://localhost:8000`. Both **must** use the `localhost` hostname (never mixing `localhost` and `127.0.0.1`) with `SESSION_DOMAIN=null` (host-only `localhost` cookie, which is shared across ports per RFC 6265), `SESSION_COOKIE=residenza-session`, and `SESSION_SAME_SITE=lax` (`SESSION_SECURE_COOKIE=false`).
    2. **Production Deployment**: Frontend (`https://residenza.eg` or `https://www.residenza.eg`) and Backend API (`https://api.residenza.eg`) must share a common registrable root domain (`.residenza.eg`) with `SESSION_DOMAIN=.residenza.eg`, `SESSION_SAME_SITE=lax`, `SESSION_SECURE_COOKIE=true`, and `SANCTUM_STATEFUL_DOMAINS=residenza.eg,www.residenza.eg`. If ever deployed on completely separate root domains, a Next.js rewrite proxy (`/api/v1/* -> backend`) would be required to preserve first-party cookie semantics.
- **TD-04 (Health Check Database Verification)**:
  - *Decision*: `GET /api/v1/health` must perform an active `DB::select('SELECT 1')` check and report `'database' => 'connected'` (or return `503 Service Unavailable` if the database connection fails) so the Foundation Quality Gate verifies live database connectivity on every health probe.

---

## 6. Task `FND-02` Independent Code Review & Quality Gate Decision (2026-11-09)

- **Overall Verdict**: **`APPROVED WITH REQUIRED FIXES`**
- **Quality Gate Status**: **CONDITIONAL HOLD — Must resolve remediation items `H-01`, `H-02`, `M-01`, `M-02`, `M-03`, `L-01`, and `L-02` before `FND-02` is closed and `FND-03` is authorized.**
- **Review Summary**:
  - Gemini 3.8 Flash respected the allowed file scope, implemented modular `Auth` and `User` controllers/requests/resources, wired `EnsureUserIsActive` and `EnsureUserIsAdmin`, updated `UserFactory`, and upgraded `GET /api/v1/health` with `DB::select('SELECT 1')`.
  - Independent code inspection and runtime config probing (`php artisan tinker`) uncovered **2 High**, **3 Medium**, and **2 Low** findings that were masked by passing tests or misstated in `.ai/FLASH_HANDOFF.md`:
    1. **[HIGH] `H-01` — Unthrottled Public Auth Endpoints**: `.ai/FLASH_HANDOFF.md` claimed `POST /api/v1/auth/login` was rate-limited, but neither `routes/api.php` nor `AuthController::login()` applies any rate limiting (`throttle` middleware or `RateLimiter`). Both `/api/v1/auth/login` and `/api/v1/auth/register` must be rate-limited.
    2. **[HIGH] `H-02` — Unprotected `Hash::check` Closure in `UpdateProfileRequest`**: `current_password` validation lacks `'bail'` and type/null guards (`is_string($value)` and `$this->filled('password')`), allowing a non-string `current_password` payload (e.g., an array) to trigger an unhandled `TypeError` (`500 INTERNAL_SERVER_ERROR`) instead of `422 VALIDATION_ERROR`, and unnecessarily validating `current_password` even when `password` is not being changed.
    3. **[MEDIUM] `M-01` — Incomplete Stateful Session Lifecycle Testing in `AuthAndProfileTest`**: `POST /api/v1/auth/register`, `GET /api/v1/auth/me`, `POST /api/v1/auth/logout`, and the mid-session suspension test were invoked without the stateful `Origin: http://localhost:3000` header, meaning Sanctum's `EnsureFrontendRequestsAreStateful` did not start a session on those requests (`$request->hasSession()` was `false`) and session regeneration/invalidation code paths went untested.
    4. **[MEDIUM] `M-02` — Session Cookie Name (`residenza-session`) & `SESSION_DOMAIN` Runtime Drift**: Runtime inspection showed `config('session.cookie')` evaluated to `"laravel-session"` and `config('session.domain')` evaluated to `"localhost"` because `config/session.php` still defaults `APP_NAME` to `'laravel'`, `phpunit.xml` lacks `SESSION_COOKIE` / `SESSION_DOMAIN` overrides, and `FoundationTest` omitted the required assertions on `residenza-session` and `config('session.domain')`.
    5. **[MEDIUM] `M-03` — `ProfileController::update()` Allows `individual` Users to Persist `company_name` & Missing Test Coverage**: Unlike `AuthController::register()`, `ProfileController::update()` does not force `company_name` to `null` for `AccountType::Individual`, and `AuthAndProfileTest` omitted test cases for `broker`/`company` users attempting to clear `company_name` on profile update.
    6. **[LOW] `L-01` — Catch-All `\Throwable` Renderer Swallows Non-419 `HttpException` and `HttpResponseException`**: In `bootstrap/app.php`, any `HttpExceptionInterface` (other than `403`, `404`, `405`, `419`, `429`) or `HttpResponseException` falls through to the `\Throwable` renderer and becomes `500 INTERNAL_SERVER_ERROR` instead of preserving its HTTP status code.
    7. **[LOW] `L-02` — Missing `declare(strict_types=1);`**: Omitted in `backend/bootstrap/app.php`, `backend/routes/api.php`, and `backend/database/factories/UserFactory.php`.

---

## 7. Task `FND-02` Second Independent Review & Final Quality Gate Approval (2026-11-09)

- **Overall Verdict**: **`APPROVED`**
- **Quality Gate Status**: **PASSED (`FND-02` CLOSED & APPROVED — Preparation of `FND-03` Authorized)**
- **Finding-by-Finding Verification**:
  1. **`H-01` (Public Auth Rate Limiting)** — **RESOLVED & VERIFIED**: `->middleware('throttle:10,1')` added to `POST /api/v1/auth/register` and `POST /api/v1/auth/login` in `backend/routes/api.php`. Verified by `test_auth_rate_limiting_blocks_brute_force_attempts()` (`429 TOO_MANY_REQUESTS` on 11th attempt).
  2. **`H-02` (`current_password` Closure Hardening)** — **RESOLVED & VERIFIED**: Added `'bail'`, `$this->filled('password')` early return, and `is_string($value)` / `$user` guards in `UpdateProfileRequest.php`. Verified by regression tests for array input (`422`) and autofilled `current_password` without `password` (`200`).
  3. **`M-01` (Stateful Session Lifecycle & `Origin` Headers)** — **RESOLVED & VERIFIED**: `Origin: http://localhost:3000` is passed across registration, login, `me`, logout, and mid-session suspension tests in `AuthAndProfileTest.php`, exercising real session regeneration and invalidation (`$this->assertAuthenticated('web')` / `$this->assertGuest('web')`). Note: `Sanctum::actingAs(...)` remains used only in `test_admin_middleware_allows_only_admins` and `test_profile_update_validation_ownership_and_restricted_fields_immutability` where RBAC and FormRequest validation rules are tested in isolation from session mechanics.
  4. **`M-02` (`residenza-session` Fallback & `SESSION_DOMAIN=null` Alignment)** — **RESOLVED & VERIFIED**: `config/session.php` default fallback updated to `'RESIDENZA'`; runtime `php artisan tinker` probe confirmed `config('session.cookie') === 'residenza-session'` and `config('session.domain') === null`; `FoundationTest` asserts both cookie emission and config values.
  5. **`M-03` (`company_name` Account-Type Enforcement & WhatsApp Preservation)** — **RESOLVED & VERIFIED**: `ProfileController::update()` forces `company_name = null` for `individual` users and preserves `$user->whatsapp_number` when omitted. Verified by regression tests across `individual`, `broker`, and `company` accounts.
  6. **`L-01` (`HttpResponseException` & Client `HttpExceptionInterface` Preservation)** — **RESOLVED & VERIFIED**: `bootstrap/app.php` preserves `HttpResponseException` responses and non-500 `HttpExceptionInterface` status codes (`error_code: 'HTTP_ERROR'`). Verified by `test_centralized_api_exception_handling_preserves_client_http_exceptions()`.
  7. **`L-02` (`declare(strict_types=1);`)** — **RESOLVED & VERIFIED**: Added to `bootstrap/app.php`, `routes/api.php`, and `database/factories/UserFactory.php`.
- **Independent Test Suite Result**: `19 passed (144 assertions)` in `1.06s` (exit code `0`).
- **Git & Secret Hygiene**: `backend/.env` and `backend/database/database.sqlite` confirmed ignored via `git check-ignore -v`; `backend/.env.example` contains zero secrets (`APP_KEY=`). Zero `/frontend` files modified.
- **Documented Environment Limitation**: Automated tests run against SQLite (`:memory:` and `database/database.sqlite`) per **OD-04**; live PostgreSQL verification remains required when staging/production PostgreSQL credentials are provided.

---

## 8. Task `FND-03` Planning & Technical Decisions (2026-11-09)

- **TD-05 (`frontend/.gitignore` Exception & Non-Destructive `.env.local` Creation)**:
  - *Finding*: `frontend/.gitignore` (generated by `create-next-app`) contains `.env*` on line 34, which overrides root `.gitignore` and prevents `frontend/.env.example` from being tracked by Git. Host inspection (`Test-Path frontend/.env.local`) confirmed `frontend/.env.local` does not yet exist.
  - *Decision*: Include `frontend/.gitignore` in the `FND-03` allowed file scope and add `!.env.example` immediately below `.env*` so `frontend/.env.example` is tracked while `frontend/.env.local` remains strictly ignored. Mandate non-destructive creation of `frontend/.env.local` (`if (!(Test-Path frontend/.env.local))`), never overwriting existing local values.
- **TD-06 (Tailwind CSS v4 Typography & Foundational RTL Shell Scope Lock)**:
  - *Finding*: `frontend/src/app/layout.tsx` loads the `Cairo` Arabic font with CSS variable `--font-cairo`, but `frontend/src/app/globals.css` still binds `--font-sans: var(--font-geist-sans)` and sets `body { font-family: Arial, Helvetica, sans-serif; }` along with an unrequested `@media (prefers-color-scheme: dark)` rule.
  - *Decision*: Bind `--font-sans: var(--font-cairo), ui-sans-serif, system-ui, sans-serif;` inside `@theme` in `globals.css`, set `font-family: var(--font-cairo), sans-serif;` on `body`, and keep all `FND-03` UI components strictly inside `frontend/src/components/layout/` (`Container`, `Header`, `Footer`, `BackendHealthStatus`) with zero marketplace pages, property cards, or future-phase features.
- **TD-07 (Host Node.js Compatibility & Cookie-Jar Stateful Sanctum Verification)**:
  - *Finding*: Host inspection (`node -v`, `npm.cmd -v`) confirmed **Node.js `v24.15.0`** and **npm `11.12.1`** are installed (exceeding Next.js 15's minimum requirement of Node.js `>= 18.18.0`), and `AdminUserSeeder` (`admin@residenza.eg`) is already seeded in `backend/database/database.sqlite`.
  - *Decision*: Rather than treating the mere presence of `Set-Cookie` headers as proof of a working stateful session, `frontend/scripts/verify-foundation.mjs` (using built-in `node:test`, compatible with Node.js `>= 18.18.0`) must implement a realistic in-memory `CookieJar` that verifies: (1) `GET /sanctum/csrf-cookie` cookie capture and `decodeURIComponent(XSRF-TOKEN)`, (2) `419 CSRF_TOKEN_MISMATCH` enforcement when `X-XSRF-TOKEN` is omitted on `POST /api/v1/auth/login`, and (3) full stateful session lifecycle (`POST /api/v1/auth/login` with decoded `X-XSRF-TOKEN` -> cookie-authenticated `GET /api/v1/auth/me` -> stateful `POST /api/v1/auth/logout` -> post-logout `GET /api/v1/auth/me` returning `401 UNAUTHENTICATED`). Automated CLI cookie-jar verification and manual browser DevTools verification must be reported distinctly in `.ai/FLASH_HANDOFF.md`.
- **TD-08 (4-State Backend Health Semantics in `BackendHealthStatus.tsx`)**:
  - *Decision*: `BackendHealthStatus.tsx` must never conflate a database error (`503 DATABASE_ERROR`) with a backend server outage (`status === 0` / network failure). It must render 4 distinct diagnostic states: `healthy` (`200 OK` + `database === 'connected'`), `db_error` (`503` / `DATABASE_ERROR` — explicitly showing API is online while DB connection failed), `api_error` (other non-200 HTTP responses), and `unreachable` (`status === 0` network error when port `8000` is offline).






---

## 9. Task `FND-03` Independent Code Review & Quality Gate Decision (2026-11-10)

- **Overall Verdict**: **`APPROVED`**
- **Quality Gate Status**: **PASSED (`FND-03` CLOSED & APPROVED — Foundation Phase Closed; Preparation of `FND-04` Authorized)**
- **Review Summary & Verification Evidence**:
  1. **Strict 17-Path Scope Compliance & Discrepancy Resolution**:
     - The authorized scope permitted exactly 17 paths.
     - The apparent discrepancy between the 15 implementation files in Gemini's interim diagnostic report and the 17 authorized paths is resolved: files 1–15 represent the codebase/configuration/documentation files (`.gitignore`, `.env.example`, `.env.local`, `api.ts`, `client.ts`, `format.ts`, `Container.tsx`, `Header.tsx`, `Footer.tsx`, `BackendHealthStatus.tsx`, `globals.css`, `layout.tsx`, `page.tsx`, `verify-foundation.mjs`, and `README.md`), while files 16 and 17 represent the governance tracking files (`.ai/PROJECT_STATE.md` and `.ai/FLASH_HANDOFF.md`) which Gemini appropriately held pending architectural review.
     - `git status -uall` and write-timestamp audits confirmed **zero backend application code files were modified** and **zero unauthorized files were created**. `package.json` in both frontend and backend remained completely untouched.
  2. **Safe Environment Configuration & Secret Hygiene**:
     - `git check-ignore frontend/.env.local` exits with code `0` (confirmed ignored).
     - `git check-ignore frontend/.env.example` exits with code `1` (confirmed tracked).
     - `frontend/.env.example` contains safe example URLs (`http://localhost:8000` and `http://localhost:8000/api/v1`) with zero credentials.
     - `frontend/.env.local` contains matching keys without leaking secrets.
  3. **Centralized Typed API Client Architecture (`frontend/src/lib/api/client.ts`)**:
     - **URL Construction**: Strips trailing slashes from base URLs; seamlessly routes full URLs, `/sanctum/*` endpoints, and versioned `/api/v1/*` endpoints.
     - **Credentials Handling**: Explicitly mandates `credentials: 'include'` on all network requests.
     - **CSRF Handshake & Decoding**: Accurately parses `document.cookie` and decodes `XSRF-TOKEN` via `decodeURIComponent()` as required by Sanctum's encoding format.
     - **Mutating Requests**: Automatically runs `ensureCsrfCookie()` if `XSRF-TOKEN` is absent in browser runtime and attaches `'X-XSRF-TOKEN': token` on `POST`, `PUT`, `PATCH`, and `DELETE` requests.
     - **FormData Support**: Detects `FormData` payloads and transmits them directly without setting `'Content-Type'`, allowing the runtime to generate standard multipart boundaries.
     - **Error Normalization**: Normalizes network disconnects to `status: 0, errorCode: 'NETWORK_ERROR'` and parses Laravel's `ApiResponse` envelope, extracting `error_code`, `message`, and validation `errors`.
  4. **Arabic-First RTL Shell & Typography**:
     - `frontend/src/app/layout.tsx` enforces `lang="ar" dir="rtl"` and loads the Cairo font.
     - `frontend/src/app/globals.css` cleanly binds `--font-sans` to `var(--font-cairo), ui-sans-serif, system-ui, sans-serif` inside Tailwind v4 `@theme`.
     - `frontend/src/components/layout/` primitives (`Container`, `Header`, `Footer`) strictly utilize logical Tailwind utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`).
     - Automated static regex scan across all `frontend/src` files verified **zero physical directional utilities** (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right`, `rounded-l-*`, `border-l-*`).
     - Numbers formatted in `format.ts` adhere to Decision `D-02` using Western Arabic numerals (`0-9`) with Egyptian currency and area units (`ج.م`, `م²`).
  5. **4-State Backend Health Diagnostics (`BackendHealthStatus.tsx`)**:
     - Conflation of database failures with server outages is strictly prevented:
       1. `healthy` (`200 OK` + `database: 'connected'`): Full system green status.
       2. `db_error` (`503` / `DATABASE_ERROR` or `database !== 'connected'`): Amber badge explicitly displaying `الخادم الخلفي متاح، ولكن تعذر الاتصال بقاعدة البيانات`, showing API online and DB disconnected.
       3. `api_error` (unexpected non-200 HTTP response): Amber/red error badge.
       4. `unreachable` (`status === 0` / `NETWORK_ERROR`): Red badge showing port 8000 offline.
  6. **Independent Verification of Test Results**:
     - `npm run build`: Compiled successfully; static pages generated (5/5); 120 kB first load JS; exited with code `0`.
     - `npx tsc --noEmit`: Strict TypeScript passed with code `0`.
     - `node --test scripts/verify-foundation.mjs`: All 3 tests passed in `2.45s` (Static RTL logical compliance, Live Health + CORS probe, and Stateful Cookie-Jar Sanctum Lifecycle).
     - `php artisan test`: 19 passed, 144 assertions in `1.04s` (zero backend regressions).
  7. **Cookie-Jar Verification Script Security & Accuracy**:
     - Uses Node.js native `node:test`, `node:assert/strict`, `fetch`, and header cookie parsing.
     - Exercises full stateful lifecycle: `GET /sanctum/csrf-cookie` -> `POST /api/v1/auth/login` without token returning `419 CSRF_TOKEN_MISMATCH` -> login with token returning `200` and session cookie -> authenticated `GET /api/v1/auth/me` returning `200` via cookies alone -> `POST /api/v1/auth/logout` returning `200` -> post-logout `GET /api/v1/auth/me` returning `401 UNAUTHENTICATED`.
     - Zero hardcoded secrets in logs or terminal output (`process.env.TEST_ADMIN_PASSWORD` fallback to seeded dev password).
  8. **Root `README.md` Accuracy**:
     - Accurately details architecture, PHP 8.3 extensions, SQLite/PostgreSQL configuration, environment variables, startup commands (`localhost` rule), and the distinction between automated cookie-jar tests and manual browser DevTools verification.
  9. **Preservation of `FND-01` and `FND-02`**:
     - All 19 backend tests continue to pass without modification.
     - Modular architecture, migrations, seeders, and enum structures remain pristine.
  10. **Build Resource Note**:
      - The current restored production build passes cleanly (`Exit code: 0`). Memory pressure on resource-constrained hosts during static page generation has been documented in `.ai/FLASH_HANDOFF.md` and `README.md` as an operational consideration.

---

## 10. Task `FND-04` Planning & Technical Decisions (Revision 5.1 — Final Review Corrections)

- **TD-09 (Additive Schema Migration with Explicit Legacy Backfill)**:
  - *Context*: Existing tests and SQLite seeders rely on tables created in `FND-01`.
  - *Decision*: In `FND-04`, schema enhancements must be applied via a dedicated additive migration (`2026_11_10_000001_enhance_taxonomy_and_properties_schema.php`). Legacy records must be explicitly classified during migration (mapping all 35 existing Sohag locations and 7 existing categories by slug) rather than applying a silent blanket default.
- **TD-10 (Strict 2-Tier Property Taxonomy with Inherited PropertyType & RestrictOnDelete)**:
  - *Context*: Category hierarchy must prevent mismatched sectors and prevent orphaned children if a parent is deleted.
  - *Decision*: Root categories (`parent_id IS NULL`) define their `property_type` (`residential`, `commercial`, `administrative`, `land`). Child subcategories (`parent_id IS NOT NULL`) **must inherit and match** their parent's `property_type`. Foreign key `parent_id` on `categories` enforces `ON DELETE RESTRICT` (`restrictOnDelete()`). All 7 existing category slugs (`apartment`, `villa`, `residential-land`, `commercial-shop`, `office-clinic`, `building`, `chalet`) and column `sort_order` are preserved intact.
- **TD-11 (Forensic Sohag Geographic Preservation, Count Reconciliation & Allowed-Parent Matrix — `R5.1-01` & `R5.1-02`)**:
  - *Reconciled Count*: Direct line-by-line recount of `SohagTaxonomySeeder.php` confirmed exactly **35 existing location records** (**13** top-level records + **22** child records: `sohag-city` [10 children], `new-sohag` [6 children], `al-kawthar` [0], `akhmim` [3 children], `tahta` [2 children], `girga` [1 child], and 7 other marakiz [0 children]). Adding **3 new records** (`sohag-governorate`, `markaz-sohag`, `new-akhmim`) produces **38 total location records**.
  - *Allowed-Parent Matrix*:
    1. `governorate`: `parent_id` MUST be `NULL`.
    2. `markaz`: `parent_id` mandatory; parent MUST be `governorate`.
    3. `city`: `parent_id` mandatory; parent MUST be `governorate` (`new-sohag`, `new-akhmim`) or `markaz` (`sohag-city`, `akhmim-city`, `tahta-city`, `girga-city`).
    4. `district`: `parent_id` mandatory; parent MUST be `city` (`hayy-sharq`, `new-sohag-d1`), `markaz` (`sahel-tahta`), or `governorate` (`al-kawthar`).
    5. `village`: `parent_id` mandatory; parent MUST be `markaz` (`akhmim-nida`, `akhmim-hawawish`).
- **TD-12 (User-Declared Legal Status vs. Private Document Vault Verification)**:
  - *Decision*: Use `declared_legal_status` enum (`registered_shahr_aqari`, `seha_tawqee`, `allocation_decision`, `initial_contract`, `inheritance_deed`, `other`), clearly presented as user-declared data.
- **TD-13 (Payment Method Semantics & `cash_or_installment` Rules — `R5.1-03` & `OD-05`)**:
  - *Decision*:
    1. `sale + cash`: `price_egp > 0` required; `down_payment_egp` and `installment_period_months` MUST be `NULL`.
    2. `sale + installment`: `price_egp > 0` required; `down_payment_egp` is optional (`NULL` or `0 <= val < price_egp` per `OD-05`); `installment_period_months` is **REQUIRED** (`1..360`).
    3. `sale + cash_or_installment`: `price_egp > 0` required (one shared advertised price); `down_payment_egp` is optional (`NULL` or `0 <= val < price_egp` per `OD-05`); `installment_period_months` is **OPTIONAL** (`NULL` or `1..360`).
    4. `rent`: `price_egp > 0` required; `payment_method`, `down_payment_egp`, and `installment_period_months` MUST be `NULL`; `rental_period` (`monthly`, `quarterly`, `yearly`, `daily`) is **REQUIRED**; `insurance_deposit_egp` is optional (`NULL` or `>= 0`).
- **TD-14 (ReferenceCodeGenerator Transaction Semantics & Concurrency — `R5-02`)**:
  - *Verified Facts*: `config/database.php` sets SQLite `'busy_timeout' => null`; `config/app.php` sets `'timezone' => 'UTC'`; Laravel 12's `ManagesTransactions::transaction()` retries immediately in a `for` loop without sleeping/exponential backoff.
  - *Decision*: Sequence increment and `Property::create()` execute in one `DB::transaction()`. Rolled-back attempts restore `reference_sequences.current_sequence` without gaps. On SQLite, `PRAGMA busy_timeout = 5000;` and bounded jittered `usleep` (`10ms–50ms`) on `ConcurrencyError` prevent `SQLITE_BUSY` failures. Year is evaluated explicitly via `Carbon::now('Africa/Cairo')->year`.
- **TD-15 (Exact Public Marketplace Visibility Predicate & `hidden` vs `reserved` — `R5-07`)**:
  - *Decision*: Visibility requires `moderation_status = 'approved' AND published_at IS NOT NULL AND published_at <= CURRENT_TIMESTAMP AND availability_status = 'available' AND deleted_at IS NULL AND user.status = 'active'`. Canonical `AvailabilityStatus` (`available`, `sold`, `rented`, `hidden`) is preserved for the MVP; `UD-01` (`reserved` status) and `UD-02` (separate cash/installment price columns) remain unresolved future decisions outside `FND-04` scope.
- **TD-16 (Partial Unique Slug Indexes & Non-Destructive Rollback — `R5-03`)**:
  - *Decision*: Drop `locations_slug_unique` and create `idx_locations_root_slug` (`WHERE parent_id IS NULL`) and `idx_locations_child_slug` (`WHERE parent_id IS NOT NULL`). In `down()`, query for duplicate slugs across parents first; if any exist, throw a diagnostic `RuntimeException` refusing rollback rather than destructively deleting or renaming records.
- **TD-17 (Building Year Static Lower Bound & Dynamic Cairo Upper Bound — `R5-04`)**:
  - *Decision*: Database enforces only the immutable lower bound `CHECK (building_year IS NULL OR building_year >= 1800)`. Application validation enforces `max:` dynamically via `Carbon::now('Africa/Cairo')->year + 5`.
- **TD-18 (Complete Moderation Lifecycle Field Mapping, Ownership Authorization & Approved 19-File Scope — `R5.1-04`, `R5.1-06`, `R5.2-01`, `R5.2-02`, `R5.2-03`)**:
  - *OD-01 Unconditional Direct Publication (`R5.2-01`)*: In transition `T3` (`admin_direct_publish`), `published_at` is set to `now()` **unconditionally** (never `$scheduledAt ?? now()`). Scheduled publication through `admin_direct_publish` is strictly prohibited; any future scheduled admin publication requires a separate workflow and explicit Product Owner approval.
  - *Strict Ownership & Admin Authorization (`R5.2-02`)*: Being a non-admin user is never sufficient authorization to edit, resubmit, or change availability of a property. Owner operations (`T1`, `T2`, `T7`, `T8`, and owner-initiated `T9`) strictly require an authenticated active user (`$actor->status === UserStatus::Active`) **AND** `$property->user_id === $actor->id` (throwing `AuthorizationException` otherwise). Admin operations (`T3`, `T4`, `T5`, `T6`, and admin-initiated `T9`) require an authenticated active admin (`$actor->status === UserStatus::Active && $actor->role === UserRole::Admin`), plus `$actor->id !== $property->user_id` on `T4`.
  - *Rejection Reason vs. Immutable Moderation Notes (`R5.2-03`)*: `properties.moderation_status` is `NOT NULL DEFAULT 'pending_review'` (never `NULL` on persisted rows), while `moderation_logs.from_status` is `NULLABLE` (`null` on initial creation transitions `submit` and `admin_direct_publish`). `properties.rejection_reason` (`TEXT NULLABLE`) stores only the latest current feedback/rejection reason (set on `request_changes` [`T5`] and `reject` [`T6`], cleared to `null` on `approve` [`T4`], `edit_reset` [`T7`], and `resubmit` [`T8`]). `moderation_logs.notes` (`TEXT NULLABLE`) stores the immutable historical note for each moderation event and is never overwritten or cleared when `properties.rejection_reason` changes or clears. Transition `T6` from `changes_requested -> rejected` is explicitly intentional and tested.
  - *Approved 19-File Scope*: Product Owner explicitly approved adding `backend/tests/Feature/FoundationTest.php` as **File #19** to update its `sohag-city` parent assertion for the new Sohag location hierarchy.
- **TD-19 (Revision 5.3 Final Technical Consistency Locks — `R5.3-01` through `R5.3-09`)**:
  - *`R5.3-01` (Signed `BIGINT` Reference Sequence with Non-Negative Constraint)*: Replaced non-portable `BIGINT UNSIGNED` on `reference_sequences.current_sequence` with signed `BIGINT NOT NULL DEFAULT 0` and `CHECK (current_sequence >= 0 AND current_sequence <= 999999999999)` (`$table->bigInteger('current_sequence')->default(0)`). Values `1..99999` format as 5 digits (`RES-2026-00001`); values `100000..999999999999` expand naturally (`RES-2026-100000`); values `> 999999999999` throw `\OverflowException`.
  - *`R5.3-02` (Complete Financial Integrity Matrix & SQL `NULL` Three-Valued Logic Safety)*: All nullable financial fields in the composite `CHECK` constraint are explicitly guarded by `IS NULL` / `IS NOT NULL` predicates so `UNKNOWN` never allows invalid combinations. Enforced via `ALTER TABLE ... ADD CONSTRAINT` on PostgreSQL and `BEFORE INSERT / BEFORE UPDATE` triggers on SQLite, plus `Property::saving()`.
  - *`R5.3-03` (Location Parent-Type Compatibility & Cycle Prevention)*: Because SQL `CHECK` cannot inspect another row's `type`, parent-type compatibility, child-compatibility on parent reclassification, and self/multi-level cycle prevention are enforced in `Location::saving()` AND via `BEFORE INSERT / BEFORE UPDATE` database triggers on `locations`.
  - *`R5.3-04` (`T2` Reference Generation & Creation Paths)*: Split `T2` into `T2-A` (direct submission of a new property: generates `reference_code`, creates `Property`, and creates `ModerationLog` [`from_status = null`] in one transaction) and `T2-B` (submission of an existing draft: preserves existing `reference_code` and logs `from_status = 'draft'`). `reference_code` is immutable once assigned.
  - *`R5.3-05` (`T8` Complete Review Metadata Reset)*: On `T8` resubmission (`changes_requested` / `rejected` -> `pending_review`), `reviewed_by`, `reviewed_at`, `published_at`, and `rejection_reason` are **all** cleared to `NULL` (matching `T2` and `T7`), while `availability_status`, `reference_code`, and historical `moderation_logs` remain untouched.
  - *`R5.3-06` (Category 2-Total-Level Depth & Cycle Prevention)*: Maximum depth = 2 total levels (Level 1 root `parent_id IS NULL` -> Level 2 child `parent_id IS NOT NULL` where parent is Level 1). Reparenting a root category that already has children is blocked at both model and DB trigger layers.
  - *`R5.3-07` (`moderation_logs` Append-Only Database Triggers)*: Enforced via `BEFORE UPDATE` trigger (always aborts) and `BEFORE DELETE` trigger (aborts if parent `properties` row still exists; allows cascade delete only when parent property is hard-deleted).
  - *`R5.3-08` (Migration Failure Safety & Step-0 Pre-Flight Rollback Gate)*: Documented `PostgresGrammar` (`$transactions = true`) vs `SQLiteGrammar` (non-transactional table rebuilds due to `PRAGMA foreign_keys`). In `down()`, duplicate-slug detection executes as Step 0 before any DDL statement runs.
  - *`R5.3-09` (PostgreSQL vs. SQLite Test Environment Truthfulness)*: Local `php artisan test` runs on SQLite; live PostgreSQL execution must be explicitly reported as `UNVERIFIED ON LIVE POSTGRESQL (VERIFIED ON SQLITE ONLY)` until a live PostgreSQL instance is provisioned and tested.

---

## 11. Task `DOM-01` Binding Decisions (Approved by Product Owner on 2026-11-15)

- **UD-01 (`hidden` vs. Dedicated `reserved` Availability Status) — `Option A` (`APPROVED by Product Owner (2026-11-15)`)**:
  - *Decision*: Keep `AvailabilityStatus` locked to the 4 existing values (`available`, `sold`, `rented`, `hidden`). Use `hidden` for temporary holds; do **NOT** add `reserved`.
- **UD-02 (Single Shared vs. Separate Cash/Installment Price Columns) — `Option B` (`APPROVED by Product Owner (2026-11-15)`)**:
  - *Decision*: Support separate cash and installment pricing for `cash_or_installment` listings via a targeted additive schema migration (`installment_price_egp` `DECIMAL(14, 2) NULLABLE`) and updated DB `CHECK` constraints / SQLite triggers aligned with `OD-05` (`down_payment_egp < installment_price_egp` when `payment_method = 'cash_or_installment'`).
