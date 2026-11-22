# RESIDENZA v2.1 & v2.2 — Agency Storefronts & Admin Control Room

This document covers the **Companies Directory & Agency Storefronts (`v2.1`)** and the **Admin Control Room & Business Analytics (`v2.2`)** backend systems in `d:\resdinza v2\backend`.

---

## 1. Companies Directory & Agency Storefronts (`v2.1`)

### Database Schema
- **`companies`**:
  - `id`, `user_id` (unique FK -> `users.id`, cascade), `name`, `slug` (unique, indexed), `logo_path`, `cover_path`, `bio`, `address`, `whatsapp`, `phone`, `accent_color` (default `#9F7753`), `is_verified` (default `false`), `timestamps`.
  - Extended in `v2.2`: `plan_tier` (`free` | `partner` | `enterprise`, default `free`), `max_properties` (integer, default `5`), `plan_expires_at` (nullable timestamp), `views_count`, `whatsapp_clicks`, `phone_clicks` (default `0`).
- **`projects`**:
  - `id`, `company_id` (FK -> `companies.id`, cascade), `name`, `slug`, `location`, `description`, `cover_path`, `timestamps`.
- **`properties`** additions:
  - `company_id` (nullable FK -> `companies.id`, set null, indexed)
  - `project_id` (nullable FK -> `projects.id`, set null)
  - `views_count`, `whatsapp_clicks`, `phone_clicks` (default `0`).

### Public & Authenticated Company Endpoints
| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/companies` | Public (`throttle:60,1`) | List all active companies (supports `?q=`, `?verified=1`, `?per_page=`) with `logo_url`, `cover_url`, `properties_count`, and `projects_count`. |
| `GET` | `/api/v1/companies/{slug}` | Public (`throttle:60,1`) | Agency storefront payload: company profile, `projects`, and paginated company properties (`?transaction_type=`, `?project_id=`, `?q=`, `?sort=`). |
| `GET` | `/api/v1/my-company` | `auth:sanctum`, `user.active` | Fetch authenticated user's company profile and projects. |
| `POST` | `/api/v1/my-company` | `auth:sanctum`, `user.active` (`throttle:20,1`) | Upsert company profile + upload `logo` & `cover` (magic-byte validated JPG/PNG/WebP; blocks SVG and `is_verified` mass-assignment). |
| `POST` | `/api/v1/my-company/projects` | `auth:sanctum`, `user.active` (`throttle:20,1`) | Create a compound/project under the user's company. |
| `DELETE` | `/api/v1/my-company/projects/{id}` | `auth:sanctum`, `user.active` | Delete a company project owned by the user. |

### Frontend Routes (`v2.1`)
- `/companies` — Public Companies & Developers Directory with search & verified filter.
- `/companies/[slug]` — Branded Public Agency Storefront with scoped property/project tabs.
- `/dashboard/company` — Agency Branding & Projects Management Dashboard.

---

## 2. Admin Control Room & Business Analytics (`v2.2`)

All `/api/v1/admin/*` routes are strictly protected by `auth:sanctum` + `user.active` + `user.admin` (`EnsureUserIsAdmin` returns `403` for non-admins). All mutating admin actions are logged in `admin_audit_logs`.

### New Database Tables & Columns
- **`users`**: `last_seen_at` (nullable timestamp, indexed), `is_active` (boolean, default `true`), `role` (`user` | `admin`).
- **`admin_audit_logs`**: `id`, `admin_id` (FK -> `users.id`), `action`, `target_type`, `target_id`, `details` (JSON/text), `created_at`.
- **`areas`**: `id`, `name` (unique), `city` (default `سوهاج`), `is_active`, `search_count`, `timestamps`. Default seeded Sohag areas: `الكوامل`, `سوهاج الجديدة`, `حي راشد`, `أخميم`, `طهطا`, `جرجا`.
- **`property_reports`**: `id`, `property_id` (FK -> `properties.id`, cascade), `reporter_phone`, `reason`, `notes`, `status` (`open` | `resolved`), `timestamps`.
- **`buyer_requests`**: `id`, `name`, `phone`, `property_type`, `area`, `budget_max`, `notes`, `assigned_company_id` (nullable FK -> `companies.id`, set null), `status` (`new` | `assigned` | `closed`), `timestamps`.
- **`site_settings`**: `key` (primary string), `value` (text), `timestamps` (`announcement_bar_text`, `announcement_bar_active`, `hero_banner_title`, `hero_banner_subtitle`, `hero_banner_image`).

### Activity Tracking & Quotas
- **`TrackUserActivity` Middleware**: Attached to the `api` middleware group; updates `users.last_seen_at` only when null or older than 2 minutes.
- **Company Property Quota**: Enforced in `PortalPropertyController::store` against `company.max_properties` (default `5` on `free` tier). Returns `403 COMPANY_PROPERTY_QUOTA_EXCEEDED` when reached; bypassed for `admin` accounts.
- **Public Marketplace Visibility**: `Property::scopePublicMarketplace` ensures public visitors only see `approved` and `available` properties, while property owners see all their listings in `/portal`.

### Public Lead Tracking & Config Endpoints
| Method | Endpoint | Rate Limit | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/track/click` | `throttle:60,1` | Atomically increment `views_count`, `whatsapp_clicks`, or `phone_clicks` for `property` or `company`. |
| `POST` | `/api/v1/properties/{id}/report` | `throttle:10,1` | Submit a listing report (`status: open`). |
| `POST` | `/api/v1/buyer-requests` | `throttle:10,1` | Submit a buyer request ("اطلب عقارك") and increment matching area `search_count`. |
| `GET` | `/api/v1/site-config` | `throttle:60,1` | Return active `areas`, `announcement_bar`, and `hero_banner` settings. |

### Admin Control Room Endpoints (`/api/v1/admin/*`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/admin/overview` | Total users, live online users (`last_seen_at >= now()->subMinutes(5)`), property counts (`pending`, `approved`, `rejected`, `stale` > 45 days), total/verified companies, total WhatsApp/Phone/View clicks, top areas, open reports count, and new buyer requests count. |
| `GET` | `/api/v1/admin/properties` | Filterable (`status=pending|approved|rejected|stale`, `q`), returning smart flags `is_potential_duplicate` and `is_suspicious_price`. |
| `PATCH` | `/api/v1/admin/properties/{id}/moderate` | Approve, reject (requires `rejection_reason`), or toggle `is_featured` with audit logging. |
| `GET` | `/api/v1/admin/users` | Filterable (`role`, `status`, `is_active`, `online=1`, `q`). |
| `PATCH` | `/api/v1/admin/users/{user}/role` | Promote/demote `user` <-> `admin` (forbids self-demotion). |
| `PATCH` | `/api/v1/admin/users/{user}/status` | Activate/suspend user via `is_active` or `status` (forbids self-ban). |
| `GET` | `/api/v1/admin/companies` | List companies with `properties_count`, `projects_count`, and owner info. |
| `PATCH` | `/api/v1/admin/companies/{company}` | Toggle `is_verified` and update `plan_tier`, `max_properties`, `plan_expires_at`. |
| `GET/POST/PATCH/DELETE` | `/api/v1/admin/areas` | Manage active Sohag neighborhoods. |
| `GET` / `PATCH` | `/api/v1/admin/reports` | List & resolve reports or reject/archive reported properties. |
| `GET` / `PATCH` | `/api/v1/admin/buyer-requests` | List buyer requests, assign `assigned_company_id`, or update status. |
| `POST` | `/api/v1/admin/site-settings` | Update announcement bar & hero banner (magic-byte validated JPG/PNG/WebP image upload max `3MB`, blocking SVG and path-traversal). |
| `GET` | `/api/v1/admin/audit-logs` | Paginated audit trail of all admin actions. |
| `GET` | `/api/v1/admin/export/{type}` | Stream UTF-8 BOM CSV (`users`, `companies`, `properties`, `buyer-requests`) with CSV Formula Injection sanitization (`=`, `+`, `-`, `@`, `\t`, `\r` prefixed with `'`). |

### Artisan Command
Promote an existing user to active admin:
```bash
cd backend
php artisan residenza:make-admin admin@residenza.eg
```
