# RESIDENZA (ريزيدنزا)

> **المنصة العقارية الرائدة والموثوقة في محافظة سوهاج**  
> **Sohag-First Real Estate Marketplace & Enterprise Platform**

---

## 1. Project Overview & Architecture

RESIDENZA is architected as a clean **Modular Monolith** consisting of two decoupled, independently maintainable directories within a unified repository:

- **`/backend`**: Laravel 12.x application exposing versioned REST APIs (`/api/v1/*`) and stateful session authentication via Laravel Sanctum. Features domain module boundaries (`Property`, `Taxonomy`, `Moderation`, `User`, `Auth`, `Media`), centralized `ApiResponse` envelopes, and localized error handling.
- **`/frontend`**: Next.js 15.2 (React 19, TypeScript, Tailwind CSS v4) configured with an Arabic-first Right-to-Left (RTL) layout, Cairo typography, strictly logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`), and a centralized typed API client handling CSRF handshakes and credentials.

---

## 2. Prerequisites & System Requirements

Ensure the following runtimes and extensions are installed on your development host:

- **PHP**: `^8.3` (Host verified: PHP 8.3.31)
  - Required Extensions: `pdo_pgsql`, `pgsql` (for production/staging PostgreSQL), `pdo_sqlite`, `sqlite3` (for local development fallback), `gd`, `exif`, `intl`, `mbstring`, `openssl`, `curl`, `fileinfo`.
- **Composer**: `^2.2`
- **Node.js**: `>= 18.18.0` (Host verified: Node.js `v24.15.0`)
- **Package Manager**: `npm` `^10.0` or `^11.0` (Host verified: `npm 11.12.1`)
- **Database**:
  - Target Production: PostgreSQL 15+
  - Local Dev Fallback: SQLite 3

---

## 3. Environment Setup & Configuration

Both `/backend` and `/frontend` utilize isolated, non-destructive environment configurations.

### 3.1 Backend Configuration (`/backend`)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. If `.env` does not exist, copy from `.env.example`:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```
3. Critical configuration variables in `backend/.env`:
   - `APP_URL=http://localhost:8000`
   - `FRONTEND_URL=http://localhost:3000`
   - `SANCTUM_STATEFUL_DOMAINS=localhost:3000`
   - `SESSION_DRIVER=database` (or `cookie` / `file` for local testing)
   - `SESSION_COOKIE=residenza-session`
   - `SESSION_DOMAIN=` *(must remain null/empty for localhost)*
   - `SESSION_SECURE_COOKIE=false` *(for local HTTP)*

### 3.2 Frontend Configuration (`/frontend`)

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. If `.env.local` does not exist, copy from `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
3. Critical configuration variables in `frontend/.env.local`:
   - `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000`
   - `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1`

---

## 4. Database Setup & Seeding

1. Run migrations and populate initial taxonomy and administrative data:
   ```bash
   cd backend
   php artisan migrate --seed
   ```
2. Link the public storage directory for media assets:
   ```bash
   php artisan storage:link
   ```

*Note: Initial seeders establish the administrative account (`admin@residenza.eg`) and foundational Sohag geographic and category taxonomies.*

---

## 5. Development Servers & Startup

> **IMPORTANT RULE: Hostname Consistency**  
> Always access both services via `localhost` (e.g. `http://localhost:3000` and `http://localhost:8000`). Never mix `127.0.0.1` and `localhost` in browser sessions, as browser cookies and Sanctum stateful domain validation are bound to the literal hostname.

### Terminal 1 — Backend API Server
```bash
cd backend
php artisan serve --host=localhost --port=8000
```
- REST API Base: `http://localhost:8000/api/v1`
- Health Probe: `http://localhost:8000/api/v1/health`
- CSRF Handshake: `http://localhost:8000/sanctum/csrf-cookie`

### Terminal 2 — Frontend Next.js Server
```bash
cd frontend
npm run dev
```
- Application Web UI: `http://localhost:3000`

---

## 6. Verification & Test Suites

The project provides rigorous automated checks across backend logic, frontend typing/compilation, and integrated stateful communication:

### 6.1 Backend Test Suite (PHPUnit)
Verifies database integrity, model relationships, RBAC, exception handling, rate limiting, and stateful authentication flows:
```bash
cd backend
php artisan test
```

### 6.2 Frontend Type Checking & Production Build
Verifies strict TypeScript compliance and Next.js compilation:
```bash
cd frontend
npx tsc --noEmit
npm run build
```

### 6.3 Integrated Foundation Verification Script
Verifies:
1. **Static RTL CSS Compliance**: Scans all `frontend/src` components for strictly logical Tailwind utilities (rejecting physical directional classes such as `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right`).
2. **Live Health & CORS Probe**: Validates `GET /api/v1/health` with `Origin: http://localhost:3000`, checking CORS headers and database connectivity.
3. **Cookie-Jar Stateful Sanctum Lifecycle**: Uses an in-memory cookie jar to verify CSRF cookie fetching, URL-decoded `X-XSRF-TOKEN` handling, `419` rejection when token is omitted, successful stateful session login, authenticated `GET /api/v1/auth/me`, stateful logout, and post-logout `401` rejection.

```bash
# Ensure the backend server is running in another terminal
cd frontend
node --test scripts/verify-foundation.mjs
```

### 6.4 Automated CLI vs. Manual Browser Verification Distinction
- **Automated Verification**: The Node.js test script (`verify-foundation.mjs`) simulates browser cookie and CORS behavior via HTTP headers and an in-memory cookie jar.
- **Manual Verification**: Launch both servers, visit `http://localhost:3000` in Google Chrome or Firefox, and inspect the interactive **"حالة التكامل مع الخادم الخلفي"** diagnostic card:
  - Confirms emerald status when both API and Database are connected.
  - Inspect Application / DevTools Cookies to verify that `residenza-session` and `XSRF-TOKEN` are successfully stored with `Domain=localhost` or host-only scope.

---

## 7. Agency Storefronts (`v2.1`) & Admin Control Room (`v2.2`)

Full schema, API endpoint, quota, and Artisan command documentation is maintained in [docs/ADMIN_SYSTEM.md](docs/ADMIN_SYSTEM.md):

- **Agency Storefronts (`v2.1`)**: Public directory (`GET /api/v1/companies`, `/companies`), branded agency storefronts (`GET /api/v1/companies/{slug}`, `/companies/[slug]`), and agency branding dashboard (`/dashboard/company`, `/api/v1/my-company`).
- **Admin Control Room (`v2.2`)**: Protected `/api/v1/admin/*` endpoints (`overview`, `properties`, `moderate`, `users`, `companies`, `areas`, `reports`, `buyer-requests`, `site-settings`, `audit-logs`, `export/{type}`), public lead/click tracking (`POST /api/v1/track/click`, `POST /api/v1/properties/{id}/report`, `POST /api/v1/buyer-requests`, `GET /api/v1/site-config`), `TrackUserActivity` middleware, company property quotas, and `php artisan residenza:make-admin {email}`.


