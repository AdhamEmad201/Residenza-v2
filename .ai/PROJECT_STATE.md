# RESIDENZA — PROJECT STATE

> **Document Role**: Live tracker of project phase, Foundation Quality Gate verification, completed milestones, pending tasks, and documented assumptions.  
> **Current Stage**: RESIDENZA `v2.2` COMPLETE — `FND-01`–`FND-04`, `DOM-01`, `DOM-02`, `UI-01`, `UI-02`, `v2.1` (Agency Storefronts & Companies Directory), `v2.2` (Admin Control Room & Business Analytics) — **`ALL PHASES APPROVED & COMPLETE`** (Date: 2026-11-22)  
> **Last Updated**: 2026-11-22  

---

## 1. Foundation Quality Gate Tracker

Per Architectural Quality Gate rules, no item is marked complete without live execution evidence:

| Quality Gate Criterion | Current Status | Execution Evidence / Resolution |
| :--- | :--- | :--- |
| **1. Frontend starts/builds successfully** | **VERIFIED (`FND-01`, `FND-03`, `FND-04`)** | `npx tsc --noEmit` exits with `0` (`Next.js 15.2.0`). `FacadeType` and `LegalStatus` TypeScript unions synchronized with backend enums. |
| **2. Backend starts/runs successfully** | **VERIFIED (`FND-01`, `FND-02`, `FND-03`, `FND-04`)** | `php artisan test` (`34 passed, 243 assertions` in `2.03s` re-verified 2026-11-15) & `php artisan serve` verified on Laravel `12.71.0` / PHP `8.3.31`. |
| **3. Database connection is verified** | **VERIFIED (`FND-02`, `FND-03`, `FND-04`)** | `GET /api/v1/health` probes database with `DB::select('SELECT 1')` and reports `database: 'connected'` (returns 503 on error). Verified via `FoundationTest.php` and `verify-foundation.mjs`. |
| **4. API health check works** | **VERIFIED (`FND-02`, `FND-03`)** | `GET /api/v1/health` returns `200 OK` JSON envelope with live database connectivity and CORS headers (`Origin: http://localhost:3000`). |
| **5. Frontend can communicate with backend** | **VERIFIED (`FND-03`)** | Centralized typed API client (`src/lib/api/client.ts`), Sanctum CSRF handshake, URL-decoded `X-XSRF-TOKEN`, and stateful cookie-jar authentication verified via `verify-foundation.mjs`. |
| **6. Configuration contains no committed secrets** | **VERIFIED (`FND-02`, `FND-03`)** | `backend/.env.example` cleared (`APP_KEY=`). `frontend/.env.example` tracked without secrets; `frontend/.env.local` and `backend/.env` strictly gitignored. |
| **7. Relevant automated tests pass** | **VERIFIED (`FND-02`, `FND-03`, `FND-04`)** | Backend test suite: `34 passed, 243 assertions`. Frontend tests: `3/3 passed` (RTL CSS, Live Health/CORS, and Stateful Cookie-Jar Sanctum Lifecycle). |
| **8. Setup instructions are documented** | **VERIFIED (`FND-03`)** | Root `README.md` documents architecture, prerequisites, environment setup, database seeding, server commands, and testing procedures. |

---

## 2. Completed Foundation Components (`FND-01`, `FND-02`, `FND-03`, `FND-04`)

### 2.1 Component Foundation (`FND-01`)
- [x] **Monorepo & Git**: Root `.git` initialized and `.gitignore` configured.
- [x] **PHP 8.3 Environment**: Enabled `pdo_pgsql`, `pgsql`, `gd`, `exif`, and `intl` in host `php.ini`.
- [x] **Backend Core (`backend/`)**:
  - Laravel 12 Modular Monolith folders (`app/Modules/{Auth,User,Taxonomy,Property,Media,Moderation}`).
  - Standardized JSON envelope helper (`App\Support\ApiResponse`).
  - 8 PHP 8.3 Backed Enums (`UserRole`, `AccountType`, `UserStatus`, `TransactionType`, `ModerationStatus`, `AvailabilityStatus`, `FinishingType`, `DocumentType`).
  - Dual-Disk storage (`public` symlinked to `public/storage`; `private` isolated at `storage/app/private`).
  - CORS (`config/cors.php`) and Sanctum (`config/sanctum.php`) configured for Stateful SPA cookies.
  - All 7 core database migrations (`users`, `categories`, `locations`, `properties` with 3 composite indexes, `property_images`, `property_documents`, `moderation_logs`) and Eloquent models.
  - `AdminUserSeeder` and `SohagTaxonomySeeder` (7 categories, 13 Sohag cities/marakiz + child neighborhoods).
- [x] **Frontend Core (`frontend/`)**:
  - Next.js 15.2 App Router, React 19, TypeScript, Tailwind CSS v4.
  - Root `layout.tsx` (`lang="ar" dir="rtl"`) and route group directories (`(public)`, `(auth)`, `(portal)`, `(admin)`).
  - Shared TypeScript API contracts (`frontend/src/types/api.ts`).

### 2.2 Hardening, Health, Authentication & Remediation (`FND-02`)
- [x] **Environment & Secret Hygiene**: Cleared `APP_KEY=` in `backend/.env.example`, synced `backend/.env` with `APP_NAME=RESIDENZA`, configured `SESSION_COOKIE=residenza-session`, `SESSION_DOMAIN=null`.
- [x] **UserFactory Schema Alignment**: Added `declare(strict_types=1);`, aligned with custom `users` schema; added `broker()`, `company()`, `admin()`, and `suspended()` states.
- [x] **Live DB Health Check**: `GET /api/v1/health` probes database with `DB::select('SELECT 1')` and reports `database: 'connected'`.
- [x] **Centralized Exception Handling**: Unifies JSON envelopes across 401, 403, 404, 405, 419, 422, 429, preserves `HttpResponseException` and client `HttpException` status codes (< 500), and provides a generic 500 handler that logs full stack traces while hiding internals from clients.
- [x] **Rate-Limited Stateful Sanctum Authentication**:
  - `POST /api/v1/auth/register` (rate-limited via `throttle:10,1`, strict validation, Egyptian phone regex, auto-defaulting whatsapp, blocks admin creation).
  - `POST /api/v1/auth/login` (rate-limited via `throttle:10,1`, checks suspension, session regeneration).
  - `POST /api/v1/auth/logout` (session invalidation and CSRF regeneration).
  - `GET /api/v1/auth/me` (returns `UserResource`).
- [x] **Authorization Middlewares**:
  - `EnsureUserIsActive` (`user.active`): Terminates session and returns 403 for suspended users.
  - `EnsureUserIsAdmin` (`user.admin`): Restricts endpoints to admin role.
- [x] **Profile Management & Validation Hardening**:
  - `PUT /api/v1/portal/profile` with Egyptian phone regex and unique phone exclusion.
  - Hardened `current_password` rule with `'bail'`, `$this->filled('password')`, and type check to eliminate 500 TypeError risk and unnecessary validation.
  - Enforced `company_name = null` for individuals while preserving existing custom WhatsApp numbers.
  - Strict immutability of `role`, `status`, `account_type`, and `id`.
- [x] **Automated Tests**: 19 tests passed (144 assertions) in `1.03s`.

### 2.3 Frontend Foundation, RTL Shell & Live Integration (`FND-03`)
- [x] **Environment & Git Hygiene**: `frontend/.gitignore` updated (`!.env.example`), `frontend/.env.example` created (safe defaults), and `frontend/.env.local` created non-destructively (gitignored).
- [x] **Tailwind v4 Arabic Typography**: Bound `--font-sans` to `var(--font-cairo)` in `frontend/src/app/globals.css`; removed legacy conflicting styles.
- [x] **Aligned API Contracts**: Appended `HealthCheckData`, `RegisterPayload`, `LoginPayload`, and `UpdateProfilePayload` to `frontend/src/types/api.ts`.
- [x] **Centralized Typed API Client (`frontend/src/lib/api/client.ts`)**:
  - Implemented `ApiError`, `ensureCsrfCookie()`, `getCookie()`, and `api.{get,post,put,patch,delete}`.
  - Automatic injection of URL-decoded `X-XSRF-TOKEN` on mutating requests.
  - Explicit `credentials: 'include'` and `Accept: 'application/json'`.
  - Native `FormData` support without overwriting multipart boundary headers.
  - Standardized JSON envelope parsing and error normalization.
- [x] **Formatting Helpers (`frontend/src/lib/utils/format.ts`)**:
  - Implemented `formatPriceEgp()`, `formatAreaSqm()`, and `formatDateAr()` with Western Arabic digits (`0-9`) per Decision `D-02`.
- [x] **Foundational RTL Shell & Nuanced Diagnostics**:
  - Created `Container.tsx`, `Header.tsx`, `Footer.tsx` using strictly logical Tailwind classes (`ms-*`, `me-*`, `ps-*`, `pe-*`).
  - Created `BackendHealthStatus.tsx` with 4 explicit states: `healthy` (200), `db_error` (503 DATABASE_ERROR, distinguishing DB failure from server outage), `api_error` (other HTTP statuses), and `unreachable` (status 0 network error).
  - Updated `layout.tsx` (shell wrapper) and `page.tsx` (status card + diagnostics).
- [x] **Automated Foundation & Sanctum Verification Suite (`frontend/scripts/verify-foundation.mjs`)**:
  - Static RTL CSS compliance scan (0 physical directional class violations).
  - Live HTTP Health & CORS probe (`GET /api/v1/health` with `Origin: http://localhost:3000`).
  - In-memory `CookieJar` stateful Sanctum lifecycle: `csrf-cookie` -> missing token 419 check -> login with token -> authenticated `/me` -> logout -> post-logout 401 check.
- [x] **Project Documentation**: Created comprehensive root `README.md`.

### 2.4 Taxonomy & Property Schema Core (`FND-04`)
- [x] **Binding Decisions Implemented**:
  - `OD-01 = A`: Admin direct property publication unconditionally sets `published_at = now()`, `reviewed_by = admin_id`, `reviewed_at = now()`, `moderation_status = approved`, and logs `admin_direct_publish` with `from_status = null`. No scheduled publication via direct publish.
  - `OD-05 = A`: Installment down payment allows `NULL` and `0.00`; positive values must be strictly `< price_egp`. Rejects values `>= price_egp` and negative values.
- [x] **Database Schema & Migrations**:
  - Created `reference_sequences` with conditional upsert (`< 999999999999`) and clean `\OverflowException`.
  - Added `parent_id`, `property_type`, `icon` to `categories`; backfilled 7 canonical categories.
  - Added `type` to `locations`; partial unique indexes `idx_locations_root_slug` and `idx_locations_child_slug`.
  - Added 14 columns to `properties`; added composite index `idx_properties_search_composite`.
  - Step 0 preflight rollback refusal gate preventing data loss; reversible empty-delta rollback.
  - Installed triggers for moderation logs immutability, category 2-tier depth, location Allowed-Parent Matrix, and financial/building integrity.
- [x] **Location Hierarchy**: Reconciled and seeded 38 total locations (`1 root + 14 direct children + 1 under markaz-sohag + 22 under cities/marakiz`).
- [x] **Retry Coordinator & Reference Code**: Dedicated retry coordinator with level-0 unwinding, `PRAGMA busy_timeout = 5000;`, safe driver-aware error classification, bounded randomized jitter (10–50ms), and 0-gap transaction rollback.
- [x] **Automated Verification**: All 15 tests in `TaxonomyAndPropertySchemaTest.php` pass (34 passed, 243 assertions overall), including SQLite table rebuild for `locations.slug` partial uniqueness and `restrictOnDelete()`, `reference_sequences` bounds, unbounded `WITH RECURSIVE` cycle detection, atomic `OD-01` rollback, and lock-contention retry.
- [x] **Frontend API Contracts**: Synchronized `frontend/src/types/api.ts` (`FacadeType`, `LegalStatus`, and all FND-04 enums/fields); `npx tsc --noEmit` passes with exit code `0`.
- [ ] **PostgreSQL Live Execution**: PostgreSQL triggers (`fn_categories_enforce_hierarchy`, `fn_locations_enforce_hierarchy`, `fn_moderation_logs_immutable_*`) and `CHECK` constraints are statically implemented in the migration and remain **`UNVERIFIED ON LIVE POSTGRESQL`** awaiting live PostgreSQL integration execution.

---

## 3. Scope & File Audit (Strict 19-File Boundary)

- **FND-01**: `APPROVED`
- **FND-02**: `APPROVED`
- **FND-03**: `APPROVED`
- **FND-04**: `APPROVED` (Date: 2026-11-15 | Independent Audit Verdict: `PASS — READY FOR ARCHITECTURAL ACCEPTANCE` | Backend `34 passed (243 assertions)`, Frontend `tsc --noEmit` `0 errors` | PostgreSQL triggers/DDL statically implemented and remain `UNVERIFIED ON LIVE POSTGRESQL`)
- **DOM-01 (`FND-05`)**: **`APPROVED`** (Date: `2026-11-15` | Independent Audit Verdict: **`PASS — READY FOR ARCHITECTURAL ACCEPTANCE`** [0 defects] | Backend `43 passed (343 assertions)`, Frontend `tsc --noEmit` `0 errors` | PostgreSQL triggers/DDL remain **`UNVERIFIED ON LIVE POSTGRESQL`**)
  - **Binding Decisions (`APPROVED by Product Owner (2026-11-15)`)**:
    - `UD-01 = Option A`: Keep `AvailabilityStatus` locked to `available`, `sold`, `rented`, `hidden` (use `hidden` for temporary holds; do NOT add `reserved`).
    - `UD-02 = Option B`: Support separate cash and installment pricing (`installment_price_egp`) for `cash_or_installment` listings (targeted schema addition + DB check/trigger alignment with `OD-05`).
  - **Authorized Scope**: Strict 24-file boundary (`backend/` + `frontend/src/types/api.ts`).
- **DOM-02**: **`APPROVED`** (Date: `2026-11-15` | Independent Audit Verdict: **`PASS — READY FOR ARCHITECTURAL ACCEPTANCE`** [0 defects] | Backend `50 passed (409 assertions)`, Frontend `tsc --noEmit` `0 errors` | PostgreSQL triggers/DDL remain **`UNVERIFIED ON LIVE POSTGRESQL`**)
  - **Authorized Scope**: Strict 22-file boundary (`backend/` + `frontend/src/types/api.ts`).
- **UI-01 (Phase 5)**: **`APPROVED`** (Date: `2026-11-16` | Warm Living Luxury & Organic Motion design direction signed off by Product Owner | Strict 26-file scope in `frontend/src/` | Independent Audit & Deep Spec Review Verdict: **`PASS`** (`0` critical/high/medium defects) | `tsc --noEmit`: `0 errors`, Static RTL Logical CSS test: `PASS` (`0` violations) | `UD-02 = B` dual cash/installment pricing & `OD-05 = A` down payment breakdown, `D-11` `"معتمد للنشر"` terminology, SSR `cache: 'no-store'` public fetches, Sanctum SPA Cookie `AuthContext` | PostgreSQL triggers/DDL remain **`UNVERIFIED ON LIVE POSTGRESQL`**)
- **UI-02 (Phase 6)**: **`APPROVED`** (Date: `2026-11-16` | Independent Read-Only Architectural, Security & Spec Audit Verdict: **`PASS — READY FOR FINAL PRODUCT OWNER ACCEPTANCE`** [0 defects] | Strict 19-file scope in `frontend/src/` | `portal.ts` & `admin.ts` API modules, `DashboardShell`, `StatusBadges` & `ModerationTimeline`, `PropertyForm` enforcing `UD-02 = B` & `OD-05 = A`, `MediaAndDocumentsManager` with private document vault streaming `/api/v1/documents/{id}/download`, `ModerationActionPanel` with Self-Approval Guard, 5 `(portal)` routes and 7 `(admin)` routes including `OD-01 = A` direct publish and Self-Suspension Guard | `tsc --noEmit`: `0 errors`, Static RTL Logical CSS test: `PASS` (`0` violations) | PostgreSQL triggers/DDL remain **`UNVERIFIED ON LIVE POSTGRESQL`**)
- **Full RESIDENZA v2 MVP Application Scope (`FND-01` through `UI-02`)**: **`ALL PHASES APPROVED & COMPLETE`** (Date: `2026-11-16` | Operational Deployment Note: PostgreSQL-specific triggers/DDL remain **`UNVERIFIED ON LIVE POSTGRESQL`** until production PostgreSQL provisioning).

---

## 4. RESIDENZA v2.1 & v2.2 Post-MVP Releases

### 4.1 v2.1 — Official SVG Branding, Agency Storefronts & Companies Directory (Completed 2026-11-22)
- [x] **Official RESIDENZA SVG Identity & Palette**: Integrated official vector logos (`/images/residenza-logo.svg`, `/images/residenza-icon.svg`, `src/app/icon.svg`) and harmonized UI tokens (`#403E3D` Charcoal, `#9F7753` Metallic Bronze, `#CEB38F` Sand Gold, `#F3EAD8` Warm Ivory).
- [x] **Agency Storefronts Backend (`companies` & `projects`)**: PostgreSQL-safe migrations, `Company` & `Project` models, `GET /api/v1/companies`, `GET /api/v1/companies/{slug}`, and authenticated `/api/v1/my-company` + `/api/v1/my-company/projects` with strict `finfo` magic-byte image validation (blocking SVG uploads and `is_verified` mass-assignment).
- [x] **Public Companies & Developers Directory (`/companies`)**: Searchable RTL directory (`frontend/src/app/companies/page.tsx`) with verified filter, connected in main `Header.tsx`, `Footer.tsx`, and the Home page (`frontend/src/app/page.tsx`).
- [x] **Public Agency Storefront (`/companies/[slug]`) & Dashboard (`/dashboard/company`)**: Scoped company listings, compounds/projects tab, marketplace `PropertyCard` agency badge, and live branding preview dashboard.
- [x] **Same-Origin Proxy & Security Hardening**: Configured Next.js `rewrites()` for `/api/*`, `/sanctum/*`, `/storage/*` and Laravel `trustProxies(at: '*')` to eliminate cross-site `419` CSRF issues on localhost and Cloudflare Tunnels.

### 4.2 v2.2 — Protected Admin Control Room & Business Analytics (Completed 2026-11-22)
- [x] **Admin Control Room Schema & Quotas**: Added `users.last_seen_at`, `users.is_active`, `companies.plan_tier`, `companies.max_properties`, `companies.plan_expires_at`, engagement click counters (`views_count`, `whatsapp_clicks`, `phone_clicks`), and tables `admin_audit_logs`, `areas` (seeded with default Sohag neighborhoods), `property_reports`, `buyer_requests`, and `site_settings`.
- [x] **Public Engagement & Intake Hooks**: Dismissible top `AnnouncementBar`, non-blocking click tracking (`POST /api/v1/track/click`), property report modal (`POST /api/v1/properties/{id}/report`), and **"اطلب عقارك"** buyer request lead form (`POST /api/v1/buyer-requests`).
- [x] **Protected Admin Control Room UI (`/admin/*`)**:
  - [x] `/admin` — Live online presence pulse (`last_seen_at` within 5 minutes), 6 KPI cards, quick pending queue, and top Sohag areas demand breakdown.
  - [x] `/admin/properties` — Moderation tabs (`pending`, `approved`, `rejected`, `stale` +45 days) with smart `is_potential_duplicate` & `is_suspicious_price` badges, 1-click approve/reject/feature, WhatsApp template, and CSV export.
  - [x] `/admin/companies` — Partner verification toggle (`is_verified`), plan tier & `max_properties` quota editor, engagement stats, and CSV export.
  - [x] `/admin/users` — Online/offline status dot, admin role promotion/demotion (with self-demotion guard), account activation/suspension (with self-ban guard), WhatsApp link, and CSV export.
  - [x] `/admin/leads-reports` — Buyer requests routing to companies + visitor property reports resolution.
  - [x] `/admin/settings` — Dynamic Sohag areas manager, announcement bar & hero banner editor (blocking SVG uploads), and paginated Admin Audit Log table.
- [x] **Artisan Command & Verification**: Added `php artisan residenza:make-admin {email}`; verified `57 passed (497 assertions)` in PHPUnit, `0 errors` in `tsc --noEmit`, and `3/3 PASS` in `verify-foundation.mjs`.

- **Total Authorized Files in FND-04**: Exactly 19 files. Zero files outside this boundary were touched.
