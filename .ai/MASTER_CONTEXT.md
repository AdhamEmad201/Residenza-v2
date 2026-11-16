# RESIDENZA — MASTER CONTEXT

> **Document Role**: Canonical source of truth for Product Vision, Approved MVP Scope, Business Rules, Domain Model, and Technology Stack.
> **Phase**: Phase 0 — Architecture Validation & Project Foundation
> **Author**: Argon 4 (Lead Software Architect & Technical Director)
> **Last Updated**: 2026-11-08

---

## 1. Product Vision & Strategic Boundaries

**RESIDENZA** is a Real Estate Marketplace MVP initially targeting **Sohag, Egypt** (`محافظة سوهاج`).

- **Short-Term Mission (Current Scope)**: Provide a trusted, moderated, Arabic-first digital property marketplace where individuals, real estate brokers (`سماسرة`), and real estate companies (`شركات عقارية`) in Sohag can list properties for sale or rent, and prospective buyers/tenants can discover verified-looking listings and connect directly via WhatsApp or phone.
- **Long-Term Vision**: Evolve into a comprehensive real estate ecosystem.
- **Strict MVP Constraint**: The architecture is structured cleanly (Modular Monolith) so future capabilities do not require a rewrite, **but zero non-MVP features may be built, stubbed, or exposed in Phase 1–6**.

---

## 2. Approved Technology Stack

| Layer | Technology | Version / Constraint | Architectural Notes |
| :--- | :--- | :--- | :--- |
| **Repository Structure** | Monorepo (Split Root Directories) | `/backend` & `/frontend` | Single Git repository at `d:\resdinza v2` with isolated dependency trees. |
| **Frontend Framework** | Next.js (App Router) | `15.x` | Route groups for `(public)`, `(portal)`, and `(admin)`. |
| **UI Library** | React | `19.x` | Server Components for public SEO pages; Client Components for interactive forms/dashboards. |
| **Frontend Language** | TypeScript | `5.x` (`strict: true`) | Shared API response/request contract types in `frontend/src/types/api.ts`. |
| **Styling & RTL** | Tailwind CSS | `v4.x` | Arabic-first (`dir="rtl"`, `lang="ar"`), logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`), Cairo/Readex Pro Arabic typography. |
| **Backend Framework** | Laravel | `12.x` | Modular Monolith organized under `app/Modules/*`, REST API only (`/api/v1/*`). |
| **Backend Runtime** | PHP | `8.3.x` (8.2+ required) | Strict types (`declare(strict_types=1);`), required extensions: `pdo_pgsql`, `pgsql`, `gd`, `exif`, `intl`, `mbstring`, `fileinfo`. |
| **Database** | PostgreSQL | `15+` (Production & Target Dev) | Strict relational integrity, enum-backed check constraints, composite B-Tree indexes for marketplace filtering. SQLite is permitted strictly as a temporary local fallback if PostgreSQL is not yet provisioned on the developer machine, provided zero SQLite-specific syntax is used. |
| **Authentication** | Laravel Sanctum | `4.x` (Stateful SPA Cookie Mode) | First-party `HttpOnly`, `SameSite=Lax` session + `XSRF-TOKEN` cookies across `localhost` / shared root domain. |
| **Infrastructure Extras** | **None (MVP Lock)** | No Redis, No Meilisearch, No Microservices | Database-backed sessions, cache, and queues (`database` driver) for zero-cost operational simplicity in MVP. |

---

## 3. Product Architecture

RESIDENZA operates as **one unified web platform** backed by a **centralized Modular Monolith API**:

1. **Public Marketplace (`(public)`)**:
   - Server-rendered / dynamically fetched public pages optimized for fast loading, Arabic SEO, and mobile responsiveness.
   - Displays **only** properties where `moderation_status = 'approved'` AND `availability_status = 'available'` (or optionally badged `sold`/`rented` if configured, never `hidden` or unapproved).
2. **User Submission Portal (`(portal)`)**:
   - Authenticated area for registered property owners (`individual`), brokers (`broker`), and companies (`company`).
   - Allows profile management, creating/editing property submissions, uploading public property photos and private verification documents, and tracking moderation feedback.
3. **Lightweight Administration Panel (`(admin)`)**:
   - Restricted strictly to users with `role = 'admin'`.
   - Provides moderation queue inspection, private document review, property approval/rejection/change-requests, admin-authored property publishing, user status management, and Sohag locations/categories CRUD.

---

## 4. Core Business Rules (Immutable)

1. **Account Types & Registration**:
   - Individuals (`individual`), Real Estate Brokers (`broker`), and Real Estate Companies (`company`) can self-register via the public registration flow.
   - Administrators (`admin`) are provisioned only via CLI seeder/command or existing admin action—never via public registration.
2. **Property Submission & Moderation Gate**:
   - Any active authenticated user (`individual`, `broker`, `company`, `admin`) can submit a property.
   - Every user-submitted property enters `pending_review` upon submission (or `draft` before submission) and **must be explicitly approved by an Administrator** before appearing in the public marketplace.
3. **Strict Self-Approval Prohibition**:
   - Non-admin users cannot access moderation endpoints.
   - Even if an Administrator submits a property as a regular listing or reviews the queue, the system policy and service layer enforce that **a user cannot approve their own user-submitted property** (`submitted_by_user_id != reviewed_by_admin_id`), or if an Admin directly creates an official platform listing, that action is logged distinctly as an `admin_direct_publish` audit event. To adhere strictly to *"Users cannot approve their own submissions"*, our `PropertyPolicy::moderate()` blocks self-approval on user submissions unless overridden by a secondary admin (or requires explicit admin-publish workflow documented in Open Decisions).
4. **Independence of Availability and Moderation Status**:
   - `moderation_status` (`draft`, `pending_review`, `changes_requested`, `approved`, `rejected`) is controlled by the moderation workflow.
   - `availability_status` (`available`, `sold`, `rented`, `hidden`) is controlled by the property owner (for their own listings) or an administrator.
   - Toggling `availability_status` (e.g., marking an approved property as `sold`, `rented`, or temporarily `hidden`) **does not** reset `moderation_status` or require re-moderation.
   - Conversely, editing core content fields (title, description, price, category, location, area, specifications, or adding new images) on an already `approved` property by a non-admin **must** transition `moderation_status` back to `pending_review` so unmoderated text/images never go live.
5. **Private Document Isolation**:
   - Any private verification attachments (e.g., national ID copy, brokerage license, ownership contract/tawkeel) are stored on a **non-public local disk** (`storage/app/private`) outside `storage/app/public`.
   - Private documents are never returned in public API payloads and have no public symlink URL. They are accessible strictly via an authenticated, policy-guarded admin/owner streaming endpoint (`GET /api/v1/admin/documents/{id}/download`).
6. **Honest Verification Terminology**:
   - The UI and API must **never** label a property as "Legally Verified Ownership" (`ملكية موثقة قانونياً`) unless an offline legal verification procedure exists and is completed.
   - Approved listings are labeled simply as **"معتمد للنشر"** (Approved for Publication) or **"تمت مراجعة البيانات"** (Listing Reviewed), preventing legal misrepresentation under Egyptian consumer/real estate norms.

---

## 5. Approved MVP Scope & Explicit Exclusions

### 5.1 In-Scope Modules
- **Public Marketplace**:
  - Homepage (Hero search, featured/latest approved listings in Sohag, category quick-links, location highlights).
  - Property Listings page with server-driven pagination, sorting (newest, price low-to-high, price high-to-low), and filters:
    - Transaction Type: Sale (`sale` / للبيع) or Rent (`rent` / للإيجار).
    - Category (Apartment, Villa, Land, Commercial Shop, Administrative Office, Building, etc.).
    - Location in Sohag (District/City & Neighborhood/Area, e.g., مدينة سوهاج، مدينة سوهاج الجديدة، أخميم، طهطا، جرجا، المراغة، إلخ).
    - Price range (`min_price`, `max_price` in EGP).
    - Area range (`min_area`, `max_area` in $m^2$).
    - Bedrooms / Bathrooms count.
  - Property Details page: Full Arabic description, structured specs, responsive image gallery, breadcrumb navigation, location summary, publisher badge (Individual / Broker / Company), and direct **WhatsApp Contact CTA** (pre-filled Arabic message with property reference code and URL) + phone call button.
  - Categories browse view & Locations browse view.
  - Static/Informational Pages: About RESIDENZA (`عن ريزيدنزا`) and Contact Us (`تواصل معنا` — contact details & simple inquiry submission or direct communication links).
- **User Portal**:
  - Registration (selecting `individual`, `broker`, or `company`), Login, Logout.
  - User Profile management (Name, Phone, WhatsApp number, Company/Agency Name, Bio).
  - Submit Property wizard/form (Arabic RTL form with validation, multi-image upload, optional private verification document upload).
  - My Properties list with live status badges (`draft`, `pending_review`, `changes_requested`, `approved`, `rejected`) and moderator feedback notes.
  - Edit own property submissions & toggle availability (`available`, `sold`, `rented`, `hidden`).
- **Admin Panel**:
  - Summary Dashboard (Counts of pending reviews, approved properties, rejected/changes-requested properties, registered users by type).
  - Moderation Queue: Inspect full property submission, view private documents securely, and execute transitions:
    - **Approve** (`approved`)
    - **Request Changes** (`changes_requested` with mandatory feedback note)
    - **Reject** (`rejected` with mandatory rejection reason)
  - Published Properties Management: Filter all properties, feature/unfeature on homepage, unpublish/hide, or create admin-authored properties directly.
  - Basic User Management: List users, filter by account type/status, activate/suspend user accounts.
  - Taxonomy Management: CRUD for Categories (`categories`) and Sohag Locations (`locations` — hierarchical: Markaz/City -> Neighborhood/District).

### 5.2 Explicitly Excluded (Zero Tolerance for Scope Creep)
- Customer Relationship Management (CRM) pipelines or lead assignment engines.
- Online payment gateways, booking deposits, or escrow.
- Subscription tiers, listing quotas, or paid featured packages.
- Commission tracking or brokerage split calculators.
- AI property valuation, AI chat assistants, or AI recommendation engines.
- Advanced telemetry dashboards, heatmaps, or BI analytics.
- Virtual Deal Rooms or digital contract signing.
- Native mobile apps (iOS/Android) — web platform must be mobile-responsive instead.
- Microservices, event brokers (Kafka/RabbitMQ), Redis clusters, or external search engines (Meilisearch/Typesense/Elasticsearch).

