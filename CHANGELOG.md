# RESIDENZA Changelog

## [v2.2.0] - 2026-11-22 — Admin Control Room & Business Analytics
- **Added (Backend)**:
  - Database migrations for `users.last_seen_at`, `users.is_active`, company plans/quotas (`plan_tier`, `max_properties`, `plan_expires_at`), property/company click counters (`views_count`, `whatsapp_clicks`, `phone_clicks`), and tables `admin_audit_logs`, `areas`, `property_reports`, `buyer_requests`, and `site_settings`.
  - `TrackUserActivity` middleware updating `last_seen_at` (throttled to 2-minute intervals) and `AdminAuditLogger` recording all mutating admin actions.
  - Public endpoints: `POST /api/v1/track/click`, `POST /api/v1/properties/{id}/report`, `POST /api/v1/buyer-requests`, and `GET /api/v1/site-config`.
  - Protected `/api/v1/admin/*` endpoints: `overview`, `properties` (with `is_potential_duplicate` & `is_suspicious_price` flags), `properties/{id}/moderate`, `users/{user}/role`, `users/{user}/status`, `companies`, `areas`, `reports`, `buyer-requests`, `site-settings` (`3MB` magic-byte image validation + path-traversal guard), `audit-logs`, and UTF-8 BOM CSV `export/{type}` with CSV Formula Injection protection.
  - Artisan command `php artisan residenza:make-admin {email}`.
- **Added (Frontend)**:
  - Public hooks: `AnnouncementBar`, `BuyerRequestBanner` ("اطلب عقارك"), property report modal ("إبلاغ عن مشكلة"), and non-blocking WhatsApp/Phone/View click tracking.
  - Protected RTL Admin Control Room pages: `/admin`, `/admin/properties`, `/admin/companies`, `/admin/users`, `/admin/leads-reports`, and `/admin/settings`.

## [v2.1.0] - 2026-11-22 — Official Branding, Agency Storefronts & Companies Directory
- **Added**:
  - Official RESIDENZA SVG branding (`/images/residenza-logo.svg`, `/images/residenza-icon.svg`, `src/app/icon.svg`) and Warm Luxury palette (`#403E3D`, `#9F7753`, `#CEB38F`, `#F3EAD8`).
  - Public Companies & Developers Directory (`/companies`, `GET /api/v1/companies`) wired into main Header, Footer, and Home page showcase.
  - Branded Public Agency Storefront (`/companies/[slug]`, `GET /api/v1/companies/{slug}`) with scoped property filters and compounds/projects tabs.
  - Agency Branding Dashboard (`/dashboard/company`, `POST /api/v1/my-company`) with live storefront preview and compound management.
  - Same-origin Next.js API proxy (`rewrites()`) and security hardening (`57/57` backend tests passing).
