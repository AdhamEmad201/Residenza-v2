# RESIDENZA — ARCHITECTURAL HANDOFF SPECIFICATION: ARGON 4 TO GEMINI 3.8 FLASH (`FND-04`)

> **From**: Argon 4 (Principal Architect, Technical Director & Independent Quality Gatekeeper)  
> **To**: Gemini 3.8 Flash (Primary Implementation Engineer)  
> **Task ID**: `FND-04`  
> **Title**: Taxonomy & Property Schema Core (Revision 5.4.2 — Final Bounded Precision Specification)  
> **Dependencies**: `FND-01` (Approved), `FND-02` (Approved), `FND-03` (Approved)  
> **Authorized Scope**: **19 Files** (`backend/tests/Feature/FoundationTest.php` explicitly approved by Product Owner as File #19)  
> **Governance Status**: **`READY FOR REVIEW — NOT APPROVED`** *(Implementation is strictly UNAUTHORIZED until explicit Product Owner approval)*  
> **Audit Reconciliation**: Fully incorporates R5.4.2 bounded precision corrections: complete rollback preflight for nullable backfilled fields, mandatory operational SQLite backup integrity verification gate (PRAGMA quick_check == 'ok', PRAGMA foreign_key_check == 0 rows, safe online backup/WAL checkpoint), bounded randomized jitter retry wording (10–50ms, max 5 attempts), and safe exception-chain unwinding with specific SQLite error-code classification excluding generic HY000.

---

## 0. Repository State, Baseline Evidence & Document Status

### 0.1 Repository State & Untracked Baseline Truthfulness
- `git status -uall` confirms the working tree is on branch `master` with no commits yet.
- All tracked codebase foundations (`backend/`, `frontend/`, `.ai/`, `README.md`, `.gitignore`) currently exist as uncommitted working tree files from completed milestones `FND-01`, `FND-02`, and `FND-03`.
- **Zero FND-04 implementation files exist**: no enhanced migrations, no new enums, no `ReferenceSequence` model, no `ReferenceCodeGenerator`, no `PropertyFactory`, and no `TaxonomyAndPropertySchemaTest.php`.
- **Active Test Baseline**: Current test suite inside `backend/` passes **19 tests, 144 assertions** (`19 passed (144 assertions)`) on local SQLite (`:memory:` via `phpunit.xml`), taking ~1.04s.
- **Frontend Baseline**: Frontend TypeScript (`npx tsc --noEmit`) and Next.js production build (`npm run build`) pass cleanly with exit code `0`.
- **Database Engine Status**:
  - **SQLite**: Local automated tests execute against SQLite. Trigger, cascade, and retry behaviors described herein are **design requirements and expectations**; they are **NOT yet verified** in the application codebase until the actual FND-04 integration tests are implemented and pass.
  - **PostgreSQL**: Zero live PostgreSQL testing has been conducted on the local machine; all live execution claims for PostgreSQL remain explicitly classified as **`UNVERIFIED ON LIVE POSTGRESQL`**.

### 0.2 Mandatory Pre-Execution Baseline Verification
Before modifying or creating any file in `FND-04` once authorized, Gemini 3.8 Flash **MUST**:
1. Run `php artisan test` inside `d:\resdinza v2\backend` and record the exact output (must report `19 passed, 144 assertions`).
2. Run `npx.cmd tsc --noEmit` and `npm.cmd run build` inside `d:\resdinza v2\frontend` (must exit with `0`).
3. Record all baseline logs in `.ai/FLASH_HANDOFF.md` before making any code modifications.

---

## 1. Binding Product-Owner Decisions & Unresolved Future Decisions

### 1.1 Binding Product-Owner Decisions (Closed & Locked)
- **`OD-01 = A` (Admin Direct Property Publication — APPROVED)**:
  When an administrator creates a property directly from the Admin Panel, it bypasses the standard user moderation queue and publishes **immediately and unconditionally**:
  - `moderation_status`: `'approved'` (`ModerationStatus::Approved`)
  - `reviewed_by`: `$admin->id`
  - `reviewed_at`: `now()`
  - `published_at`: `now()` *(Unconditionally `now()`; scheduled future publication is strictly prohibited through `admin_direct_publish`. Any future scheduled admin publication requires a separate workflow and explicit Product Owner approval.)*
  - Moderation audit log entry created in `moderation_logs` **inside the same database transaction**:
    - `property_id`: `$property->id`
    - `actor_id`: `$admin->id`
    - `from_status`: `null`
    - `to_status`: `'approved'` (`ModerationStatus::Approved`)
    - `action`: `'admin_direct_publish'`
    - `notes`: `'نشر مباشر بواسطة إدارة المنصة'`

- **`OD-05 = A` (Installment Down Payment Requirement — APPROVED)**:
  Installment down payment (`down_payment_egp`) is **optional**:
  - `NULL` is allowed (no down payment specified).
  - `0.00` is allowed (explicit zero down-payment promotion: `بدون مقدم`).
  - Positive values must be strictly less than `price_egp` (`down_payment_egp < price_egp`).
  - Negative values (`< 0`) and values `>= price_egp` are strictly prohibited.

- **Canonical `AvailabilityStatus` Preserved**:
  The existing four `AvailabilityStatus` cases (`available`, `sold`, `rented`, `hidden`) are preserved unchanged for the MVP.

### 1.2 Unresolved Future Decisions (Excluded from `FND-04` Implementation Scope)
- **`UD-01` (`hidden` vs. Dedicated `reserved` Availability Status)**:
  - `hidden` represents an owner voluntarily pausing public visibility of a listing; `reserved` represents a property under earnest-money reservation (`عربون`).
  - `AvailabilityStatus` remains locked to its 4 canonical values (`available`, `sold`, `rented`, `hidden`). Introducing a 5th `reserved` case remains an unresolved future decision outside `FND-04` scope.
- **`UD-02` (Single Shared vs. Separate Cash/Installment Price Columns)**:
  - `price_egp` stores one shared advertised base price for `cash_or_installment` listings alongside `down_payment_egp` and `installment_period_months`. Introducing separate cash and installment price columns remains an unresolved future decision outside `FND-04` scope.

---

## 2. Conservative Rollback Preflight & Mandatory Operational SQLite Backup Gate (`R5.4.2-A` & `R5.4.2-B`)

### 2.1 Complete Conservative Preflight Refusal Inventory with Explicit NULL-State Semantics
In `down()`, provenance cannot distinguish whether a database row contains an initial migration backfill value or a subsequent user/admin modification. Furthermore, if a row was backfilled to an expected non-NULL baseline and subsequently cleared to `NULL` (or vice versa), dropping the column followed by re-migration would re-run the backfill and silently overwrite or distort user data.

Therefore, Residenza adopts a **strict conservative refusal policy** covering all populated states, unexpected NULL states, and type-mismatch anomalies:

| Table | Column / Item Introduced | Canonical Post-Backfill Baseline | Expected Legitimate NULL States | Unacceptable Deviation / Data Loss on Rollback & Re-Up | Conservative Preflight Refusal Condition |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`properties`** | `payment_method` | `sale` rows backfilled to `'cash'`. | For `transaction_type = 'rent'`, `payment_method` **MUST BE NULL**. | If `sale` has `payment_method IS NULL`, or `payment_method != 'cash'`, or if `rent` has `payment_method IS NOT NULL`: dropping column and re-migrating would force `sale` to `'cash'` and erase custom settings. | `SELECT 1 FROM properties WHERE (transaction_type = 'sale' AND (payment_method IS NULL OR payment_method != 'cash')) OR (transaction_type != 'sale' AND payment_method IS NOT NULL)` |
| **`properties`** | `rental_period` | `rent` rows backfilled to `'monthly'`. | For `transaction_type = 'sale'`, `rental_period` **MUST BE NULL**. | If `rent` has `rental_period IS NULL`, or `rental_period != 'monthly'`, or if `sale` has `rental_period IS NOT NULL`: dropping column and re-migrating would force `rent` to `'monthly'`. | `SELECT 1 FROM properties WHERE (transaction_type = 'rent' AND (rental_period IS NULL OR rental_period != 'monthly')) OR (transaction_type != 'rent' AND rental_period IS NOT NULL)` |
| **`properties`** | `down_payment_egp` | Default `NULL`. | Optional for installment sales; `NULL` for cash sales and rent. | Any non-NULL value represents populated user financial data that would be permanently destroyed. | `SELECT 1 FROM properties WHERE down_payment_egp IS NOT NULL` |
| **`properties`** | `installment_period_months` | Default `NULL`. | Required for installment sales; `NULL` for cash sales and rent. | Any non-NULL value represents populated installment duration that would be permanently destroyed. | `SELECT 1 FROM properties WHERE installment_period_months IS NOT NULL` |
| **`properties`** | `insurance_deposit_egp` | Default `NULL`. | Optional for rent; `NULL` for sales. | Any non-NULL value represents populated security deposit that would be permanently destroyed. | `SELECT 1 FROM properties WHERE insurance_deposit_egp IS NOT NULL` |
| **`properties`** | `total_floors` | Default `NULL`. | Optional for building/apartment listings. | Any non-NULL value represents populated building metrics that would be permanently destroyed. | `SELECT 1 FROM properties WHERE total_floors IS NOT NULL` |
| **`properties`** | `building_year` | Default `NULL`. | Optional construction year. | Any non-NULL value represents populated year built that would be permanently destroyed. | `SELECT 1 FROM properties WHERE building_year IS NOT NULL` |
| **`properties`** | `street_width_meters` | Default `NULL`. | Optional street width. | Any non-NULL value represents populated street dimension that would be permanently destroyed. | `SELECT 1 FROM properties WHERE street_width_meters IS NOT NULL` |
| **`properties`** | `facade_type` | Default `NULL`. | Optional orientation. | Any non-NULL value represents populated orientation that would be permanently destroyed. | `SELECT 1 FROM properties WHERE facade_type IS NOT NULL` |
| **`properties`** | `declared_legal_status` | Default `NULL`. | Optional legal registration. | Any non-NULL value represents populated legal status that would be permanently destroyed. | `SELECT 1 FROM properties WHERE declared_legal_status IS NOT NULL` |
| **`properties`** | `has_elevator`, `has_electricity_meter`, `has_water_meter`, `has_natural_gas` | Default `false`. | `false` is default baseline. | Any `true` value represents populated utility flags that would be permanently reverted to `false`. | `SELECT 1 FROM properties WHERE has_elevator = true OR has_electricity_meter = true OR has_water_meter = true OR has_natural_gas = true` |
| **`categories`**| `property_type` | Backfilled to match exact sector of 7 seeded categories (`apartment:residential`, `villa:residential`, `residential-land:land`, `commercial-shop:commercial`, `office-clinic:administrative`, `building:residential`, `chalet:residential`). | **NEVER NULL** (`NOT NULL`). | If any seeded category's sector was modified, or if any custom category was added, dropping the column destroys sector classification. | Refuse if any category has `property_type IS NULL`, or differs from the canonical 7-category mapping, or if any custom category exists. |
| **`categories`**| `parent_id` | Default `NULL` (all 7 seeded are roots). | Root categories have `parent_id IS NULL`. | Any non-NULL value represents child subcategories that would be permanently flattened into roots or orphaned. | `SELECT 1 FROM categories WHERE parent_id IS NOT NULL` |
| **`categories`**| `icon` | Default `NULL`. | Optional UI icon identifier. | Any non-NULL value represents populated icon metadata that would be permanently destroyed. | `SELECT 1 FROM categories WHERE icon IS NOT NULL` |
| **`locations`** | `type` (`LocationType`) | Backfilled to exact administrative types across all 38 Sohag nodes (§5). | **NEVER NULL** (`NOT NULL`). | If any location's administrative type was modified, or if any custom non-Sohag location exists, dropping the column destroys hierarchy typing. | Refuse if any location has `type IS NULL`, or differs from canonical 38 mapping, or if any custom location exists. |
| **`locations`** | Partial Unique Indexes | `idx_locations_root_slug` & `idx_locations_child_slug`. | N/A | Duplicate slugs across parents would cause restoration of `locations_slug_unique` to fail. | `SELECT slug FROM locations GROUP BY slug HAVING COUNT(*) > 1` |
| **`locations`** | 3 New Location Nodes (`sohag-governorate`, `markaz-sohag`, `new-akhmim`) | Created in `up()`. | N/A | If any property references them, or if custom child locations are attached to them, deleting nodes violates FK constraints or orphans data. | `SELECT 1 FROM properties WHERE location_id IN (new_node_ids)` OR custom children attached to them. |
| **`reference_sequences`** | Sequence Counters | Seeded/backfilled per year. | **NEVER NULL** (`NOT NULL DEFAULT 0`). | If table is dropped, re-migration re-derives counter from `MAX(reference_code)`. If highest-numbered listings were hard-deleted, counter rewinds and reissues codes! | Refuse if for any year, `current_sequence > COALESCE((SELECT MAX(CAST(SUBSTR(reference_code, 10) AS INTEGER)) FROM properties WHERE reference_code LIKE 'RES-' || year || '-%'), 0)`. |

### 2.2 Complete Preflight Refusal Code Implementation (`Step 0`)
Step 0 executes before any schema modification or data change. If any condition triggers, a `\RuntimeException` is thrown and rollback halts:

```php
// 1. Property data loss and baseline deviation guard (including soft-deleted properties)
$hasMeaningfulPropertyData = DB::table('properties')->where(function ($q) {
    // Sale listings where payment_method was altered from 'cash' OR cleared to NULL
    $q->where(fn ($sub) => $sub->where('transaction_type', 'sale')
                               ->where(fn ($s) => $s->whereNull('payment_method')->orWhere('payment_method', '!=', 'cash')))
      // Non-sale listings where payment_method is unexpectedly populated
      ->orWhere(fn ($sub) => $sub->where('transaction_type', '!=', 'sale')->whereNotNull('payment_method'))
      // Rent listings where rental_period was altered from 'monthly' OR cleared to NULL
      ->orWhere(fn ($sub) => $sub->where('transaction_type', 'rent')
                                 ->where(fn ($s) => $s->whereNull('rental_period')->orWhere('rental_period', '!=', 'monthly')))
      // Non-rent listings where rental_period is unexpectedly populated
      ->orWhere(fn ($sub) => $sub->where('transaction_type', '!=', 'rent')->whereNotNull('rental_period'))
      // Populated financial and building attributes
      ->orWhereNotNull('down_payment_egp')
      ->orWhereNotNull('installment_period_months')
      ->orWhereNotNull('insurance_deposit_egp')
      ->orWhereNotNull('total_floors')
      ->orWhereNotNull('building_year')
      ->orWhereNotNull('street_width_meters')
      ->orWhereNotNull('facade_type')
      ->orWhereNotNull('declared_legal_status')
      ->orWhere('has_elevator', true)
      ->orWhere('has_electricity_meter', true)
      ->orWhere('has_water_meter', true)
      ->orWhere('has_natural_gas', true);
})->exists();

if ($hasMeaningfulPropertyData) {
    throw new \RuntimeException('Cannot rollback FND-04 migration: properties contain populated FND-04 attributes or deviations from canonical baseline that would be permanently destroyed.');
}

// 2. Category modifications and hierarchy guard
$canonicalCategories = [
    'apartment' => 'residential',
    'villa' => 'residential',
    'residential-land' => 'land',
    'commercial-shop' => 'commercial',
    'office-clinic' => 'administrative',
    'building' => 'residential',
    'chalet' => 'residential',
];

$categories = DB::table('categories')->get();
foreach ($categories as $cat) {
    if ($cat->parent_id !== null) {
        throw new \RuntimeException('Cannot rollback FND-04 migration: categories table contains child subcategories.');
    }
    if ($cat->icon !== null) {
        throw new \RuntimeException('Cannot rollback FND-04 migration: categories table contains populated icon metadata.');
    }
    if ($cat->property_type === null || !isset($canonicalCategories[$cat->slug]) || $cat->property_type !== $canonicalCategories[$cat->slug]) {
        throw new \RuntimeException("Cannot rollback FND-04 migration: category '{$cat->slug}' has a modified, NULL, or custom property_type.");
    }
}

// 3. Location hierarchy, slug collisions and modifications guard
$duplicateSlugs = DB::table('locations')->select('slug')->groupBy('slug')->havingRaw('COUNT(*) > 1')->exists();
if ($duplicateSlugs) {
    throw new \RuntimeException('Cannot rollback FND-04 migration: duplicate location slugs exist across parents, violating locations_slug_unique restoration.');
}

$newLocationIds = DB::table('locations')->whereIn('slug', ['sohag-governorate', 'markaz-sohag', 'new-akhmim'])->pluck('id');
if ($newLocationIds->isNotEmpty()) {
    if (DB::table('properties')->whereIn('location_id', $newLocationIds)->exists()) {
        throw new \RuntimeException('Cannot rollback FND-04 migration: properties reference newly added hierarchy nodes (sohag-governorate, markaz-sohag, or new-akhmim).');
    }

    $customChildren = DB::table('locations')
        ->whereIn('parent_id', $newLocationIds)
        ->whereNotIn('slug', array_merge(['sohag-city'], [
            'new-sohag', 'al-kawthar', 'akhmim', 'tahta', 'girga',
            'al-maragha', 'tima', 'al-balyana', 'al-monshaah', 'saqalta', 'guhayna', 'dar-el-salam'
        ]))
        ->exists();
    if ($customChildren) {
        throw new \RuntimeException('Cannot rollback FND-04 migration: custom child locations depend on the new hierarchy nodes.');
    }
}

// Verify every existing location matches its canonical type exactly
$canonicalLocationTypes = /* canonical 38 mapping from Section 5 */;
$locations = DB::table('locations')->get();
foreach ($locations as $loc) {
    if ($loc->type === null || !isset($canonicalLocationTypes[$loc->slug]) || $loc->type !== $canonicalLocationTypes[$loc->slug]) {
        throw new \RuntimeException("Cannot rollback FND-04 migration: location '{$loc->slug}' has a modified, NULL, or custom administrative type.");
    }
}

// 4. Reference sequence rewind guard
$sequences = DB::table('reference_sequences')->get();
foreach ($sequences as $seq) {
    $maxExisting = (int) DB::table('properties')
        ->where('reference_code', 'LIKE', "RES-{$seq->year}-%")
        ->selectRaw("MAX(CAST(SUBSTR(reference_code, 10) AS INTEGER)) as max_seq")
        ->value('max_seq');
    if ($seq->current_sequence > $maxExisting) {
        throw new \RuntimeException("Cannot rollback FND-04 migration: reference sequence for year {$seq->year} ({$seq->current_sequence}) exceeds maximum reconstructable property reference ({$maxExisting}).");
    }
}
```

### 2.3 Mandatory Operational SQLite Backup Verification Gate (`R5.4.2-B`)
- **Operational Reality**: SQLite table alteration requires copying data to temporary tables (`__temp__*`) and toggling `PRAGMA foreign_keys = OFF`. SQLite ignores foreign key toggles inside active transactions. Consequently, **Laravel does not wrap SQLite DDL migrations in transactions (`SQLiteGrammar::$transactions = false`)**. Preflight validation eliminates business-rule errors, but **cannot guarantee physical DDL atomicity** if an unexpected crash (power loss, OOM, hardware failure) occurs mid-rebuild.
- **Backup Is a Recovery Safeguard, NOT a Guarantee of DDL Atomicity**: Having a database backup does not make SQLite DDL operations atomic; it provides the operational mechanism to restore schema consistency when non-atomic DDL fails midway.
- **Operational Safety Gate Requirements**:
  1. **Consistent Backup Creation Method**: Prior to running any migration maintenance (`php artisan migrate`, `migrate:rollback`, or `migrate:refresh`) against a persistent SQLite database (`database/database.sqlite`), an automated operational or deployment pre-flight procedure must create the backup at `database/database.sqlite.bak` using a safe and consistent method:
     - **Preferred Method**: Use SQLite's online backup API or SQLite CLI `.backup` command (e.g. `sqlite3 database/database.sqlite ".backup 'database/database.sqlite.bak'"`), which safely captures transactions and active pages.
     - **Filesystem Copy Requirement**: If a direct filesystem copy is used, it **MUST** occur during a strict maintenance window with application writes stopped and WAL checkpointed (`PRAGMA wal_checkpoint(TRUNCATE);`). Operational scripts must never assume copying only the main `.sqlite` file while WAL or shared-memory files (`.sqlite-wal`, `.sqlite-shm`) are active is safe.
  2. **Integrity Verification Gate**: Before executing the migration command, the deployment/operational process must verify that the backup can be opened independently and passes all integrity checks:
     - The backup file `database/database.sqlite.bak` exists and has `filesize() > 0`.
     - Executing `PRAGMA quick_check;` on `database.sqlite.bak` returns exactly `ok`. (`SELECT COUNT(*) FROM sqlite_master` is **NOT** a database integrity check and must not be used as one).
     - Executing `PRAGMA foreign_key_check;` on `database.sqlite.bak` returns **zero rows** (verifying complete referential integrity).
  3. **Failure Policy**: If backup creation fails, or if either `PRAGMA quick_check;` or `PRAGMA foreign_key_check;` fails on the backup, **migration maintenance MUST NOT proceed**.
  4. **Enforcement Boundary**: This gate is strictly an **operational and deployment procedure requirement** (to be executed via deployment shell scripts, CI/CD pipelines, or maintenance runbooks). It is **NOT** injected as custom framework hooks inside the application migration file itself, preserving the authorized 19-file scope.
  5. **Recovery Responsibilities & Migration Record Prohibition**:
     If a DDL failure occurs midway during `down()`:
     - The migration aborts and Laravel does **NOT** delete the batch row from `migrations`.
     - Operational personnel must **NEVER** manually delete the migration record from `migrations` while the schema is partially altered.
     - Personnel must restore the verified backup (`database.sqlite.bak -> database.sqlite`), verify schema integrity, and investigate the root cause before attempting maintenance again.

---

## 3. Reference Sequence Atomic Overflow & Allocation Boundaries

- **Table**: `reference_sequences` (`year INTEGER PRIMARY KEY`, `current_sequence BIGINT NOT NULL DEFAULT 0`, `updated_at TIMESTAMP NULL`).
- **Constraint**: `CHECK (year >= 2020 AND year <= 9999 AND current_sequence >= 0 AND current_sequence <= 999999999999)`.
- **Conditional Atomic Upsert Query**:
  - **PostgreSQL (`pgsql`)**:
    ```sql
    INSERT INTO reference_sequences (year, current_sequence, updated_at)
    VALUES (?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT (year) DO UPDATE
    SET current_sequence = reference_sequences.current_sequence + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE reference_sequences.current_sequence < 999999999999
    RETURNING current_sequence
    ```
    If `$row === null`, throw `\OverflowException`.
  - **SQLite (`sqlite`)**:
    ```sql
    INSERT INTO reference_sequences (year, current_sequence, updated_at)
    VALUES (?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT (year) DO UPDATE
    SET current_sequence = reference_sequences.current_sequence + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE reference_sequences.current_sequence < 999999999999
    ```
    Executed via `DB::affectingStatement()`. If `$affected === 0`, throw `\OverflowException`. If `$affected === 1`, query `SELECT current_sequence FROM reference_sequences WHERE year = ?`.
- **Behavior at Bounds**:
  - At `999999999998`: Sequence updates to `999999999999`. Formats as `RES-2026-999999999999`.
  - At `999999999999`: Predicate `< 999999999999` is false. Database performs a safe no-op. Zero rows affected/returned. Database `CHECK` constraint is **never violated**. `ReferenceCodeGenerator` throws `\OverflowException`.
- **Transaction & Rollback**:
  - Must be executed inside an active transaction (`DB::transactionLevel() > 0`), as the first write statement.
  - If any subsequent step in property creation fails, the surrounding transaction executes a full `ROLLBACK`, restoring `current_sequence` with **zero committed sequence gaps**.

---

## 4. SQLite Transaction Retry Strategy & Safe Error Classification (`R5.4.2-C`)

### 4.1 Transaction Boundary & Ownership Responsibilities
- Orchestration responsibilities reside in a dedicated coordinator service: `App\Modules\Property\Services\PropertyCreationTransactionCoordinator` (encapsulated within authorized property service domain files).
- **Outer Caller Ownership Guard**: The coordinator only owns transaction lifecycle and retries when it is the root initiator (`$initialLevel === 0`). It **NEVER** rolls back or retries a transaction owned by an outer caller.
- **Nested Propagation**: When called inside an outer transaction (`$initialLevel > 0`), the coordinator executes `DB::transaction($operation, attempts: 1)` with **zero sleep and zero retry**. If a lock exception occurs, it is rethrown immediately so the outermost transaction owner can handle recovery.

### 4.2 Complete Exception-Chain Inspection & Unwinding Algorithm
1. **Level-0 Guard & Pre-Transaction PRAGMA**:
   Before initiating a transaction on SQLite, if `DB::transactionLevel() === 0`, execute `DB::statement('PRAGMA busy_timeout = 5000;')`.
2. **Outer Retry Loop (`attempts <= 5`)**:
   ```php
   $initialLevel = DB::transactionLevel();

   // If already inside an outer caller's transaction, execute directly without retrying
   if ($initialLevel > 0) {
       return DB::transaction(fn () => $operation(), attempts: 1);
   }

   for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
       try {
           return DB::transaction(fn () => $operation(), attempts: 1);
       } catch (\Throwable $e) {
           // Ensure the coordinator's own failed transaction has fully unwound to level 0 before retry
           while (DB::transactionLevel() > 0) {
               DB::rollBack();
           }

           // Safe driver-aware concurrency classification inspecting entire exception chain
           $isConcurrencyError = self::isRetryableConcurrencyError($e);

           if ($isConcurrencyError && $attempt < $maxAttempts && DB::transactionLevel() === 0) {
               // Bounded randomized jitter: 10ms to 50ms with maximum 5 attempts
               usleep(random_int(10000, 50000));
               continue;
           }

           // Non-concurrency errors (Validation, OverflowException, CHECK failure) throw immediately
           throw $e;
       }
   }
   ```
3. **Safe Exception-Chain Classification Algorithm**:
   Generic `HY000` is SQLSTATE for general errors and **MUST NOT** be treated as a concurrency error on its own. The classifier inspects the complete exception chain (`$e = $e->getPrevious()`):
   ```php
   protected static function isRetryableConcurrencyError(\Throwable $e): bool
   {
       // 1. Implementation-time verification requirement: inspect installed Laravel detector
       if (app()->bound(\Illuminate\Contracts\Database\ConcurrencyErrorDetector::class)) {
           $detector = app(\Illuminate\Contracts\Database\ConcurrencyErrorDetector::class);
           if ($detector->causedByConcurrencyError($e)) {
               return true;
           }
       }

       // 2. Inspect complete exception chain for confirmed SQLite BUSY / LOCKED indicators
       $cursor = $e;
       while ($cursor !== null) {
           $msg = strtolower($cursor->getMessage());
           if (str_contains($msg, 'database is locked') ||
               str_contains($msg, 'database table is locked') ||
               str_contains($msg, 'the database file is locked') ||
               str_contains($msg, 'sqlite_busy') ||
               str_contains($msg, 'sqlite_locked')) {
               return true;
           }

           // Inspect PDO driver-specific errorInfo where available
           if ($cursor instanceof \PDOException) {
               // errorInfo[1] is driver-specific integer error code (SQLite extended error codes)
               // Code 5 = SQLITE_BUSY, Code 6 = SQLITE_LOCKED, Code 261 = SQLITE_BUSY_RECOVERY, Code 517 = SQLITE_BUSY_SNAPSHOT
               if (isset($cursor->errorInfo[1]) && in_array((int) $cursor->errorInfo[1], [5, 6, 261, 517], true)) {
                   return true;
               }

               // Code 40001 is SQLSTATE serialization_failure / deadlock
               if ($cursor->getCode() === 40001 || $cursor->getCode() === '40001') {
                   return true;
               }
           }

           $cursor = $cursor->getPrevious();
       }

       return false;
   }
   ```

---

## 5. Location Taxonomy — Forensic 35 vs. 38 Reconciliation & Hierarchy Rules

### 5.1 Reconciliation Table
Line-by-line inspection of `backend/database/seeders/SohagTaxonomySeeder.php` confirms the exact current baseline of **35 records** (13 roots + 22 children):

- **Existing 13 Roots (`parent_id = null`)**:
  `sohag-city` (10 children), `new-sohag` (6 children), `al-kawthar` (0), `akhmim` (3 children), `tahta` (2 children), `girga` (1 child), `al-maragha` (0), `tima` (0), `al-balyana` (0), `al-monshaah` (0), `saqalta` (0), `guhayna` (0), `dar-el-salam` (0).
- **Net 3-Record Increase**:
  - `N1`: `sohag-governorate` (New Root Governorate, `parent_id = null`, `type = governorate`)
  - `N2`: `markaz-sohag` (New Administrative Center, `parent_id -> sohag-governorate`, `type = markaz`)
  - `N3`: `new-akhmim` (New NUCA Urban City, `parent_id -> sohag-governorate`, `type = city`)
- **Parent Re-assignment of Existing Records**:
  - `sohag-city` (#1) re-parented under `markaz-sohag` (`type = city`). Its 10 child districts remain attached to `sohag-city`.
  - The other 12 original top-level records re-parented under `sohag-governorate`. Their children remain attached to them.
- **Target Distribution Breakdown (`1 Root + 37 Non-Root Descendants = 38 Total Locations`)**:
  - **1 Root**: `sohag-governorate` (`parent_id IS NULL`).
  - **14 Direct Children under `sohag-governorate`**:
    - 2 New: `markaz-sohag` (`markaz`), `new-akhmim` (`city`).
    - 12 Existing Roots: `new-sohag` (`city`), `al-kawthar` (`district`), `akhmim` (`markaz`), `tahta` (`markaz`), `girga` (`markaz`), `al-maragha` (`markaz`), `tima` (`markaz`), `al-balyana` (`markaz`), `al-monshaah` (`markaz`), `saqalta` (`markaz`), `guhayna` (`markaz`), `dar-el-salam` (`markaz`).
  - **1 Direct Child under `markaz-sohag`**: `sohag-city` (`city`).
  - **22 Children under Cities/Marakiz**:
    - Under `sohag-city`: 10 districts.
    - Under `new-sohag`: 6 districts.
    - Under `akhmim`: 3 records (`akhmim-city` [city], `akhmim-nida` [village], `akhmim-hawawish` [village]).
    - Under `tahta`: 2 records (`tahta-city` [city], `sahel-tahta` [district]).
    - Under `girga`: 1 record (`girga-city` [city]).
  - **Exact Sum**: `1 + 14 + 1 + 22 = 38 Locations`.

### 5.2 Seeder Idempotency & Composite Identity Resolution
`SohagTaxonomySeeder.php` (File #14) must:
1. Create/update `sohag-governorate` first.
2. Query parent IDs deterministically and use composite identity lookups:
   `Location::updateOrCreate(['parent_id' => $parentId, 'slug' => $slug], [...])`.
3. Explicitly populate `type` (`LocationType`) on every node.
4. Ensure repeated executions produce identical row counts (38) with zero duplicate records and zero parent resets.

---

## 6. Category Taxonomy & 2-Tier Depth Rules

- **Macro Sector Enum (`PropertyType`)**: `residential`, `commercial`, `administrative`, `land`.
- **Existing 7 Categories Preserved**: `apartment` (residential), `villa` (residential), `residential-land` (land), `commercial-shop` (commercial), `office-clinic` (administrative), `building` (residential), `chalet` (residential).
- **Depth Limit**: Maximum 2 total levels (Level 1 root `parent_id IS NULL` -> Level 2 child `parent_id IS NOT NULL` where parent is Level 1). Level 3 grandchildren are prohibited.
- **Inherited `property_type`**: Child subcategories must inherit and match their root parent's `property_type`.
- **Reparenting Guards**: Reparenting a root category that already has children is blocked at both model (`Category::saving()`) and database trigger layers (`trg_categories_enforce_hierarchy_ins/upd`).

---

## 7. Financial Terms & Complete Physical Integrity Matrix

### 7.1 Truth Table & SQL NULL-Safe CHECK Constraints
Every nullable column in `chk_properties_financial_integrity` is guarded by an explicit `IS NULL` or `IS NOT NULL` check to prevent SQL three-valued logic (`UNKNOWN`) from bypassing constraints:

```sql
CONSTRAINT chk_properties_financial_integrity CHECK (
    price_egp IS NOT NULL AND price_egp > 0
    AND area_sqm IS NOT NULL AND area_sqm > 0
    AND (
        (
            transaction_type = 'sale'
            AND payment_method IS NOT NULL
            AND payment_method IN ('cash', 'installment', 'cash_or_installment')
            AND rental_period IS NULL
            AND insurance_deposit_egp IS NULL
            AND (
                (
                    payment_method = 'cash'
                    AND down_payment_egp IS NULL
                    AND installment_period_months IS NULL
                )
                OR (
                    payment_method = 'installment'
                    AND (down_payment_egp IS NULL OR (down_payment_egp >= 0 AND down_payment_egp < price_egp))
                    AND (installment_period_months IS NOT NULL AND installment_period_months >= 1 AND installment_period_months <= 360)
                )
                OR (
                    payment_method = 'cash_or_installment'
                    AND (down_payment_egp IS NULL OR (down_payment_egp >= 0 AND down_payment_egp < price_egp))
                    AND (installment_period_months IS NULL OR (installment_period_months >= 1 AND installment_period_months <= 360))
                )
            )
        )
        OR (
            transaction_type = 'rent'
            AND payment_method IS NULL
            AND down_payment_egp IS NULL
            AND installment_period_months IS NULL
            AND rental_period IS NOT NULL
            AND rental_period IN ('monthly', 'quarterly', 'yearly', 'daily')
            AND (insurance_deposit_egp IS NULL OR insurance_deposit_egp >= 0)
        )
    )
)
```

### 7.2 Physical Building Constraints & Cairo Dynamic Upper Bound
- `total_floors`: `CHECK (total_floors IS NULL OR (total_floors >= 1 AND total_floors <= 100))`
- `floor_level <= total_floors`: `CHECK (floor_level IS NULL OR total_floors IS NULL OR floor_level <= total_floors)`
- `street_width_meters`: `CHECK (street_width_meters IS NULL OR (street_width_meters >= 1.00 AND street_width_meters <= 100.00))`
- `building_year`: Database enforces static lower bound `CHECK (building_year IS NULL OR building_year >= 1800)`. Application FormRequest validates dynamic upper bound: `<= Carbon::now('Africa/Cairo')->year + 5`.

---

## 8. Moderation Lifecycle, Review Metadata Reset & Append-Only Audit

### 8.1 Append-Only Immutability & Cascade Deletion Requirements
- **Design Intent**:
  - `BEFORE UPDATE` trigger `trg_moderation_logs_immutable_upd` aborts all updates.
  - `BEFORE DELETE` trigger `trg_moderation_logs_immutable_del` checks:
    ```sql
    CREATE TRIGGER trg_moderation_logs_immutable_del BEFORE DELETE ON moderation_logs
    WHEN EXISTS (SELECT 1 FROM properties WHERE id = OLD.property_id)
    BEGIN
        SELECT RAISE(ABORT, 'moderation_logs records cannot be deleted while parent property exists');
    END;
    ```
- **Verification Status vs. Design Expectation**:
  - **No FND-04 trigger implementation or tests currently exist in the repository.**
  - The behavior that SQLite permits `ON DELETE CASCADE` when a parent property is hard-deleted is an **architectural design expectation**, **NOT** yet verified in this application codebase.
  - It becomes **VERIFIED ON SQLITE** only after the actual automated integration test (`TaxonomyAndPropertySchemaTest`) is implemented and passes.
  - PostgreSQL cascade trigger behavior remains **`UNVERIFIED ON LIVE POSTGRESQL`** until tested against an active PostgreSQL instance.
- **Required Automated Proof**:
  Test #14 in `TaxonomyAndPropertySchemaTest.php` must explicitly prove:
  1. Direct `DELETE FROM moderation_logs WHERE id = ?` on an active property throws a trigger abort exception.
  2. Direct `DELETE FROM moderation_logs WHERE id = ?` on a soft-deleted property (`$property->delete()`) throws a trigger abort exception.
  3. Hard deletion of the parent property (`$property->forceDelete()`) cascades cleanly and leaves 0 child moderation logs.
  4. Direct `UPDATE moderation_logs` throws a trigger abort exception.

### 8.2 Review Metadata Reset (`T8` Resubmission)
On resubmission from `changes_requested` or `rejected` via `T8`:
- `moderation_status`: Set to `'pending_review'`.
- `reviewed_by`: Cleared to `NULL`.
- `reviewed_at`: Cleared to `NULL`.
- `published_at`: Cleared to `NULL`.
- `rejection_reason`: Cleared to `NULL`.
- `availability_status` and `reference_code`: **Preserved unchanged**.
- Historical `moderation_logs`: **Preserved untouched**; new audit row appended with `action = 'resubmit'`.

### 8.3 Public Marketplace Visibility Predicate
```sql
properties.moderation_status = 'approved'
AND properties.published_at IS NOT NULL
AND properties.published_at <= CURRENT_TIMESTAMP
AND properties.availability_status = 'available'
AND properties.deleted_at IS NULL
AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = properties.user_id
      AND users.status = 'active'
)
```

---

## 9. Comprehensive Planned Test Matrix (`TaxonomyAndPropertySchemaTest.php`)

*(All 15 tests below are planned implementation tests. None have been executed yet.)*

1. `test_payment_method_combinations_and_financial_truth_table`: Verifies valid cash, installment, cash_or_installment, and rent listings.
2. `test_zero_and_null_down_payments_are_accepted_on_installment_sales_od05`: Verifies `NULL` and `0.00` down payments succeed (`OD-05`).
3. `test_invalid_financial_combinations_are_rejected_at_model_and_database_layers`: Verifies rejection of invalid financial combinations at both Eloquent and raw SQL trigger layers.
4. `test_reference_generator_requires_active_transaction_and_rollback_restores_sequence_without_gaps`: Verifies calling generator outside transaction throws `\LogicException`, and failed creation transactions roll back sequence numbers without gaps.
5. `test_reference_generator_retry_coordinator_handles_concurrency_and_preserves_immutability`: Fault-injects lock exceptions on attempt 1; verifies attempt 2 commits cleanly. Verifies reference codes are immutable.
6. `test_reference_generator_year_rollover_max_valid_sequence_and_atomic_overflow_exception`: Verifies sequence `999999999998` increments to `RES-2026-999999999999`, and the next call throws `\OverflowException` (not `QueryException`).
7. `test_location_partial_unique_indexes_prevent_duplicate_root_and_sibling_slugs_while_allowing_distinct_parents`: Verifies partial unique indexes on root and child locations.
8. `test_migration_safe_rollback_refuses_when_data_exists_and_reverts_cleanly_on_empty_delta`: Verifies Step 0 preflight refusal when properties with new attributes exist, and verifies clean restoration of original 35 locations when safe.
9. `test_full_sohag_taxonomy_preservation_35_existing_plus_3_new_and_idempotency`: Verifies exact `1 + 14 + 1 + 22 = 38` hierarchy distribution and seeder idempotency.
10. `test_location_allowed_parent_matrix_reclassification_and_cycle_prevention`: Verifies allowed parent-child types, cycle detection, and parent reclassification guards.
11. `test_category_hierarchy_two_level_depth_cycle_prevention_and_restrict_on_delete`: Verifies 2-level maximum depth, property_type inheritance, and delete restrictions.
12. `test_building_year_validation_and_cairo_timezone_rollover`: Verifies lower bound `1800` and dynamic upper bound (`Cairo year + 5`).
13. `test_admin_direct_publication_unconditional_now_and_moderation_log_atomicity_od01`: Verifies admin direct publication sets `published_at = now()` unconditionally and logs audit atomically (`OD-01`).
14. `test_complete_moderation_transitions_t8_review_reset_ownership_auth_and_append_only_logs_with_cascade`: Proves that direct moderation log updates and deletes fail, parent force-delete cascades cleanly, and T8 resets review metadata.
15. `test_public_marketplace_visibility_predicate_excludes_all_ineligible_states`: Verifies public visibility scope strictly excludes drafts, unapproved, scheduled, sold, rented, hidden, and suspended listings.

---

## 10. PostgreSQL Verification Limitations (`UNVERIFIED ON LIVE POSTGRESQL`)

Until a live PostgreSQL 15+ server is provisioned and tested with `DB_CONNECTION=pgsql`, the following items **MUST** be explicitly classified in all reports as **`UNVERIFIED ON LIVE POSTGRESQL`**:
1. Live PostgreSQL execution of `ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)` DDL.
2. PostgreSQL PL/pgSQL trigger function behavior and transaction abortion.
3. Multi-connection row lock contention under concurrent `ON CONFLICT (year) DO UPDATE ... RETURNING current_sequence`.
4. PostgreSQL `ON DELETE CASCADE` execution order relative to `BEFORE DELETE` triggers on `moderation_logs`.
5. PostgreSQL statement-level `BEFORE TRUNCATE` trigger protection.

---

## 11. Exact 19-File Authorized Implementation Scope

Gemini 3.8 Flash is authorized (upon Product Owner approval) to create or modify **ONLY** the following 19 files:

1. `backend/database/migrations/2026_11_10_000001_enhance_taxonomy_and_properties_schema.php` *(create)*
2. `backend/app/Enums/PropertyType.php` *(create)*
3. `backend/app/Enums/PaymentMethod.php` *(create)*
4. `backend/app/Enums/RentalPeriod.php` *(create)*
5. `backend/app/Enums/LocationType.php` *(create)*
6. `backend/app/Enums/FacadeType.php` *(create)*
7. `backend/app/Enums/LegalStatus.php` *(create)*
8. `backend/app/Modules/Taxonomy/Models/Category.php` *(modify)*
9. `backend/app/Modules/Taxonomy/Models/Location.php` *(modify)*
10. `backend/app/Modules/Property/Models/Property.php` *(modify)*
11. `backend/app/Modules/Property/Models/ReferenceSequence.php` *(create)*
12. `backend/app/Modules/Property/Services/ReferenceCodeGenerator.php` *(create)*
13. `backend/database/factories/PropertyFactory.php` *(create)*
14. `backend/database/seeders/SohagTaxonomySeeder.php` *(modify)*
15. `backend/tests/Feature/TaxonomyAndPropertySchemaTest.php` *(create)*
16. `frontend/src/types/api.ts` *(modify)*
17. `.ai/PROJECT_STATE.md` *(modify)*
18. `.ai/FLASH_HANDOFF.md` *(modify)*
19. `backend/tests/Feature/FoundationTest.php` *(modify — explicitly approved by Product Owner to update `sohag-city` parent assertion from `assertNull($sohagCity->parent_id)` to verify parenting under `markaz-sohag` -> `sohag-governorate`)*

---

## 12. Governance Status & Cross-Check Against Binding Decisions

- **`OD-01 = A` (Admin Direct Publication)**: Cross-checked. Transition `T3` enforces `published_at = now()` unconditionally, assigns `reviewed_by = $admin->id`, `reviewed_at = now()`, and atomically logs `admin_direct_publish` with `from_status = null` and `to_status = approved`. No scheduled publication allowed through direct publish.
- **`OD-05 = A` (Installment Down Payment)**: Cross-checked. Down payment allows `NULL` and `0.00`, requires positive values to be strictly `< price_egp`, and rejects negative values or values `>= price_egp`.
- **Approved Milestones Preserved**: `FND-01`, `FND-02`, and `FND-03` remain completely intact and passing 100% of baseline tests.
- **Current Status**:
  - **`FND-04`**: **`READY FOR REVIEW — NOT APPROVED`**
  - **`FND-04 IMPLEMENTATION`**: **`NOT AUTHORIZED`**
  - **`GEMINI IMPLEMENTATION`**: **`NOT STARTED`**
