<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // ---------------------------------------------------------------------
        // Step 1: Preflight check on existing legacy reference codes
        // ---------------------------------------------------------------------
        if (Schema::hasTable('properties')) {
            $properties = DB::table('properties')->select('id', 'reference_code')->get();
            foreach ($properties as $prop) {
                if ($prop->reference_code !== null && !preg_match('/^RES-(\d{4})-(\d{5,12})$/', (string) $prop->reference_code)) {
                    throw new \RuntimeException("Cannot run FND-04 migration: invalid legacy reference code found on property {$prop->id}: {$prop->reference_code}");
                }
            }
        }

        // ---------------------------------------------------------------------
        // Step 2: Create reference_sequences table and backfill current_sequence
        // ---------------------------------------------------------------------
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::statement('
                CREATE TABLE reference_sequences (
                    year INTEGER PRIMARY KEY NOT NULL,
                    current_sequence INTEGER NOT NULL DEFAULT 0,
                    updated_at DATETIME NULL,
                    CONSTRAINT chk_reference_sequences_bounds CHECK (year >= 2020 AND year <= 9999 AND current_sequence >= 0 AND current_sequence <= 999999999999)
                )
            ');
        } else {
            Schema::create('reference_sequences', function (Blueprint $table) {
                $table->unsignedSmallInteger('year')->primary();
                $table->unsignedBigInteger('current_sequence')->default(0);
                $table->timestamp('updated_at')->nullable();
            });

            if ($driver === 'pgsql') {
                DB::statement('ALTER TABLE reference_sequences ADD CONSTRAINT chk_reference_sequences_bounds CHECK (year >= 2020 AND year <= 9999 AND current_sequence >= 0 AND current_sequence <= 999999999999)');
            }
        }

        // Backfill current_sequence from properties.reference_code
        if (Schema::hasTable('properties')) {
            $props = DB::table('properties')->select('reference_code')->get();
            $yearMax = [];
            foreach ($props as $p) {
                if ($p->reference_code && preg_match('/^RES-(\d{4})-(\d{5,12})$/', (string) $p->reference_code, $matches)) {
                    $year = (int) $matches[1];
                    $seq = (int) $matches[2];
                    if (!isset($yearMax[$year]) || $seq > $yearMax[$year]) {
                        $yearMax[$year] = $seq;
                    }
                }
            }
            foreach ($yearMax as $year => $maxSeq) {
                DB::table('reference_sequences')->updateOrInsert(
                    ['year' => $year],
                    ['current_sequence' => $maxSeq, 'updated_at' => now()]
                );
            }
        }

        // ---------------------------------------------------------------------
        // Step 3: Enhance categories table (parent_id, property_type, icon)
        // ---------------------------------------------------------------------
        Schema::table('categories', function (Blueprint $table) {
            $table->foreignId('parent_id')->nullable()->after('id')->constrained('categories')->restrictOnDelete();
            $table->string('property_type', 30)->default('residential')->after('slug');
            $table->string('icon', 100)->nullable()->after('property_type');
        });

        // Backfill 7 canonical seeded categories
        $canonicalCategories = [
            'apartment' => 'residential',
            'villa' => 'residential',
            'residential-land' => 'land',
            'commercial-shop' => 'commercial',
            'office-clinic' => 'administrative',
            'building' => 'residential',
            'chalet' => 'residential',
        ];
        foreach ($canonicalCategories as $slug => $propType) {
            DB::table('categories')->where('slug', $slug)->update(['property_type' => $propType]);
        }

        // ---------------------------------------------------------------------
        // Step 4: Enhance locations table (type, restrictOnDelete, remove global slug unique)
        // ---------------------------------------------------------------------
        if ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF');

            DB::statement("
                CREATE TABLE locations_temp (
                    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                    parent_id INTEGER NULL,
                    type VARCHAR NOT NULL DEFAULT 'city',
                    name_ar VARCHAR NOT NULL,
                    name_en VARCHAR NULL,
                    slug VARCHAR NOT NULL,
                    is_active TINYINT(1) NOT NULL DEFAULT 1,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME NULL,
                    updated_at DATETIME NULL,
                    FOREIGN KEY (parent_id) REFERENCES locations (id) ON DELETE RESTRICT
                )
            ");

            DB::statement("
                INSERT INTO locations_temp (id, parent_id, type, name_ar, name_en, slug, is_active, sort_order, created_at, updated_at)
                SELECT id, parent_id, 'city', name_ar, name_en, slug, is_active, sort_order, created_at, updated_at
                FROM locations
            ");

            DB::statement('DROP TABLE locations');
            DB::statement('ALTER TABLE locations_temp RENAME TO locations');
            DB::statement('PRAGMA foreign_keys = ON');
        } else {
            Schema::table('locations', function (Blueprint $table) {
                $table->string('type', 30)->default('city')->after('parent_id');
                $table->dropUnique('locations_slug_unique');
                $table->dropForeign(['parent_id']);
                $table->foreign('parent_id')->references('id')->on('locations')->restrictOnDelete();
            });
        }

        // ---------------------------------------------------------------------
        // Step 5: Execute Sohag DML backfill/seeding in locations
        // ---------------------------------------------------------------------
        $hasSohag = DB::table('locations')->where('slug', 'sohag-city')->exists();
        if ($hasSohag) {
            // Insert 1 root governorate
            $govId = DB::table('locations')->insertGetId([
                'parent_id' => null,
                'type' => 'governorate',
                'name_ar' => 'محافظة سوهاج',
                'name_en' => 'Sohag Governorate',
                'slug' => 'sohag-governorate',
                'is_active' => true,
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Insert markaz-sohag
            $markazSohagId = DB::table('locations')->insertGetId([
                'parent_id' => $govId,
                'type' => 'markaz',
                'name_ar' => 'مركز سوهاج',
                'name_en' => 'Markaz Sohag',
                'slug' => 'markaz-sohag',
                'is_active' => true,
                'sort_order' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Insert new-akhmim
            DB::table('locations')->insert([
                'parent_id' => $govId,
                'type' => 'city',
                'name_ar' => 'مدينة أخميم الجديدة',
                'name_en' => 'New Akhmim City',
                'slug' => 'new-akhmim',
                'is_active' => true,
                'sort_order' => 3,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Reparent sohag-city under markaz-sohag
            DB::table('locations')->where('slug', 'sohag-city')->update([
                'parent_id' => $markazSohagId,
                'type' => 'city',
            ]);

            // Reparent other 12 original roots under sohag-governorate and set types
            $rootsToGovernorate = [
                'new-sohag' => 'city',
                'al-kawthar' => 'district',
                'akhmim' => 'markaz',
                'tahta' => 'markaz',
                'girga' => 'markaz',
                'al-maragha' => 'markaz',
                'tima' => 'markaz',
                'al-balyana' => 'markaz',
                'al-monshaah' => 'markaz',
                'saqalta' => 'markaz',
                'guhayna' => 'markaz',
                'dar-el-salam' => 'markaz',
            ];
            foreach ($rootsToGovernorate as $slug => $type) {
                DB::table('locations')->where('slug', $slug)->update([
                    'parent_id' => $govId,
                    'type' => $type,
                ]);
            }

            // Set administrative types on existing children
            $sohagCityDistricts = [
                'hayy-sharq', 'hayy-gharb', 'al-zahraa', 'al-arqam', 'al-thaqafa',
                '15th-street', 'al-gomhoreya', 'corniche-sharq', 'corniche-gharb', 'city-area'
            ];
            DB::table('locations')->whereIn('slug', $sohagCityDistricts)->update(['type' => 'district']);

            $newSohagDistricts = [
                'new-sohag-d1', 'new-sohag-d2', 'new-sohag-d3',
                'new-sohag-villas', 'new-sohag-ebny-betak', 'new-sohag-nakheel'
            ];
            DB::table('locations')->whereIn('slug', $newSohagDistricts)->update(['type' => 'district']);

            DB::table('locations')->where('slug', 'akhmim-city')->update(['type' => 'city']);
            DB::table('locations')->where('slug', 'akhmim-nida')->update(['type' => 'village']);
            DB::table('locations')->where('slug', 'akhmim-hawawish')->update(['type' => 'village']);

            DB::table('locations')->where('slug', 'tahta-city')->update(['type' => 'city']);
            DB::table('locations')->where('slug', 'sahel-tahta')->update(['type' => 'district']);

            DB::table('locations')->where('slug', 'girga-city')->update(['type' => 'city']);
        }

        // ---------------------------------------------------------------------
        // Step 6: Add 14 columns to properties, composite search index & backfill
        // ---------------------------------------------------------------------
        Schema::table('properties', function (Blueprint $table) {
            $table->string('payment_method', 30)->nullable()->after('transaction_type');
            $table->string('rental_period', 30)->nullable()->after('payment_method');
            $table->decimal('down_payment_egp', 14, 2)->nullable()->after('price_egp');
            $table->unsignedSmallInteger('installment_period_months')->nullable()->after('down_payment_egp');
            $table->decimal('insurance_deposit_egp', 14, 2)->nullable()->after('installment_period_months');
            $table->unsignedSmallInteger('total_floors')->nullable()->after('floor_level');
            $table->unsignedSmallInteger('building_year')->nullable()->after('total_floors');
            $table->decimal('street_width_meters', 5, 2)->nullable()->after('building_year');
            $table->string('facade_type', 30)->nullable()->after('street_width_meters');
            $table->string('declared_legal_status', 40)->nullable()->after('facade_type');
            $table->boolean('has_elevator')->default(false)->after('declared_legal_status');
            $table->boolean('has_electricity_meter')->default(false)->after('has_elevator');
            $table->boolean('has_water_meter')->default(false)->after('has_electricity_meter');
            $table->boolean('has_natural_gas')->default(false)->after('has_water_meter');

            $table->index(
                ['moderation_status', 'availability_status', 'transaction_type', 'price_egp', 'area_sqm'],
                'idx_properties_search_composite'
            );
        });

        // Backfill existing properties
        DB::table('properties')->where('transaction_type', 'sale')->update(['payment_method' => 'cash']);
        DB::table('properties')->where('transaction_type', 'rent')->update(['rental_period' => 'monthly']);

        // ---------------------------------------------------------------------
        // Step 7: Create partial unique indexes on locations
        // ---------------------------------------------------------------------
        DB::statement('CREATE UNIQUE INDEX idx_locations_root_slug ON locations (slug) WHERE parent_id IS NULL');
        DB::statement('CREATE UNIQUE INDEX idx_locations_child_slug ON locations (parent_id, slug) WHERE parent_id IS NOT NULL');

        // ---------------------------------------------------------------------
        // Step 8: Install database triggers and check constraints
        // ---------------------------------------------------------------------
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            // Moderation logs immutability
            DB::unprepared("
                CREATE TRIGGER trg_moderation_logs_immutable_upd BEFORE UPDATE ON moderation_logs
                BEGIN
                    SELECT RAISE(ABORT, 'moderation_logs records are append-only and cannot be updated');
                END;
            ");

            DB::unprepared("
                CREATE TRIGGER trg_moderation_logs_immutable_del BEFORE DELETE ON moderation_logs
                WHEN EXISTS (SELECT 1 FROM properties WHERE id = OLD.property_id)
                BEGIN
                    SELECT RAISE(ABORT, 'moderation_logs records cannot be deleted while parent property exists');
                END;
            ");

            // Category hierarchy enforcement (max 2 levels and property_type inheritance)
            DB::unprepared("
                CREATE TRIGGER trg_categories_enforce_hierarchy_ins BEFORE INSERT ON categories
                WHEN NEW.parent_id IS NOT NULL AND (
                    (SELECT parent_id FROM categories WHERE id = NEW.parent_id) IS NOT NULL
                    OR (SELECT property_type FROM categories WHERE id = NEW.parent_id) != NEW.property_type
                )
                BEGIN
                    SELECT RAISE(ABORT, 'Category hierarchy violation: subcategories cannot have grandchildren and must match parent property_type');
                END;
            ");

            DB::unprepared("
                CREATE TRIGGER trg_categories_enforce_hierarchy_upd BEFORE UPDATE ON categories
                WHEN (NEW.parent_id IS NOT NULL AND (
                    (SELECT parent_id FROM categories WHERE id = NEW.parent_id) IS NOT NULL
                    OR (SELECT property_type FROM categories WHERE id = NEW.parent_id) != NEW.property_type
                )) OR (OLD.parent_id IS NULL AND NEW.parent_id IS NOT NULL AND EXISTS (SELECT 1 FROM categories WHERE parent_id = OLD.id))
                BEGIN
                    SELECT RAISE(ABORT, 'Category hierarchy violation: subcategories cannot have grandchildren and root with children cannot be reparented');
                END;
            ");

            // Location hierarchy enforcement (Allowed-Parent Matrix + Unbounded WITH RECURSIVE Cycle Prevention)
            DB::unprepared("
                CREATE TRIGGER trg_locations_enforce_hierarchy_ins BEFORE INSERT ON locations
                WHEN (
                    (NEW.type = 'governorate' AND NEW.parent_id IS NOT NULL)
                    OR (NEW.type = 'markaz' AND (NEW.parent_id IS NULL OR (SELECT type FROM locations WHERE id = NEW.parent_id) != 'governorate'))
                    OR (NEW.type = 'city' AND (NEW.parent_id IS NULL OR (SELECT type FROM locations WHERE id = NEW.parent_id) NOT IN ('governorate', 'markaz')))
                    OR (NEW.type = 'district' AND (NEW.parent_id IS NULL OR (SELECT type FROM locations WHERE id = NEW.parent_id) NOT IN ('city', 'markaz', 'governorate')))
                    OR (NEW.type = 'village' AND (NEW.parent_id IS NULL OR (SELECT type FROM locations WHERE id = NEW.parent_id) != 'markaz'))
                )
                BEGIN
                    SELECT RAISE(ABORT, 'Location hierarchy violation: invalid parent location type');
                END;
            ");

            DB::unprepared("
                CREATE TRIGGER trg_locations_enforce_hierarchy_upd BEFORE UPDATE ON locations
                BEGIN
                    SELECT RAISE(ABORT, 'Location hierarchy violation: circular hierarchy detected')
                    WHERE NEW.parent_id IS NOT NULL AND (
                        NEW.parent_id = OLD.id
                        OR EXISTS (
                            WITH RECURSIVE ancestors(id, parent_id) AS (
                                SELECT id, parent_id FROM locations WHERE id = NEW.parent_id
                                UNION
                                SELECT l.id, l.parent_id
                                FROM locations l
                                JOIN ancestors a ON l.id = a.parent_id
                                WHERE a.parent_id IS NOT NULL
                            )
                            SELECT 1 FROM ancestors WHERE id = OLD.id
                        )
                    );

                    SELECT RAISE(ABORT, 'Location hierarchy violation: invalid parent location type')
                    WHERE (
                        (NEW.type = 'governorate' AND NEW.parent_id IS NOT NULL)
                        OR (NEW.type = 'markaz' AND (NEW.parent_id IS NULL OR (SELECT type FROM locations WHERE id = NEW.parent_id) != 'governorate'))
                        OR (NEW.type = 'city' AND (NEW.parent_id IS NULL OR (SELECT type FROM locations WHERE id = NEW.parent_id) NOT IN ('governorate', 'markaz')))
                        OR (NEW.type = 'district' AND (NEW.parent_id IS NULL OR (SELECT type FROM locations WHERE id = NEW.parent_id) NOT IN ('city', 'markaz', 'governorate')))
                        OR (NEW.type = 'village' AND (NEW.parent_id IS NULL OR (SELECT type FROM locations WHERE id = NEW.parent_id) != 'markaz'))
                    );

                    SELECT RAISE(ABORT, 'Location hierarchy violation: incompatible existing child location for reclassified type')
                    WHERE OLD.type != NEW.type AND EXISTS (
                        SELECT 1 FROM locations c
                        WHERE c.parent_id = OLD.id
                        AND (
                            (c.type = 'governorate')
                            OR (c.type = 'markaz' AND NEW.type != 'governorate')
                            OR (c.type = 'city' AND NEW.type NOT IN ('governorate', 'markaz'))
                            OR (c.type = 'district' AND NEW.type NOT IN ('city', 'markaz', 'governorate'))
                            OR (c.type = 'village' AND NEW.type != 'markaz')
                        )
                    );
                END;
            ");

            // Property financial & building integrity checks on SQLite
            $propCheckCondition = "
                NOT (
                    NEW.price_egp IS NOT NULL AND NEW.price_egp > 0
                    AND NEW.area_sqm IS NOT NULL AND NEW.area_sqm > 0
                    AND (
                        (
                            NEW.transaction_type = 'sale'
                            AND NEW.payment_method IS NOT NULL
                            AND NEW.payment_method IN ('cash', 'installment', 'cash_or_installment')
                            AND NEW.rental_period IS NULL
                            AND NEW.insurance_deposit_egp IS NULL
                            AND (
                                (
                                    NEW.payment_method = 'cash'
                                    AND NEW.down_payment_egp IS NULL
                                    AND NEW.installment_period_months IS NULL
                                )
                                OR (
                                    NEW.payment_method = 'installment'
                                    AND (NEW.down_payment_egp IS NULL OR (NEW.down_payment_egp >= 0 AND NEW.down_payment_egp < NEW.price_egp))
                                    AND (NEW.installment_period_months IS NOT NULL AND NEW.installment_period_months >= 1 AND NEW.installment_period_months <= 360)
                                )
                                OR (
                                    NEW.payment_method = 'cash_or_installment'
                                    AND (NEW.down_payment_egp IS NULL OR (NEW.down_payment_egp >= 0 AND NEW.down_payment_egp < NEW.price_egp))
                                    AND (NEW.installment_period_months IS NULL OR (NEW.installment_period_months >= 1 AND NEW.installment_period_months <= 360))
                                )
                            )
                        )
                        OR (
                            NEW.transaction_type = 'rent'
                            AND NEW.payment_method IS NULL
                            AND NEW.down_payment_egp IS NULL
                            AND NEW.installment_period_months IS NULL
                            AND NEW.rental_period IS NOT NULL
                            AND NEW.rental_period IN ('monthly', 'quarterly', 'yearly', 'daily')
                            AND (NEW.insurance_deposit_egp IS NULL OR NEW.insurance_deposit_egp >= 0)
                        )
                    )
                    AND (NEW.total_floors IS NULL OR (NEW.total_floors >= 1 AND NEW.total_floors <= 100))
                    AND (NEW.floor_level IS NULL OR NEW.total_floors IS NULL OR NEW.floor_level <= NEW.total_floors)
                    AND (NEW.street_width_meters IS NULL OR (NEW.street_width_meters >= 1.00 AND NEW.street_width_meters <= 100.00))
                    AND (NEW.building_year IS NULL OR NEW.building_year >= 1800)
                )
            ";

            DB::unprepared("
                CREATE TRIGGER trg_properties_check_ins BEFORE INSERT ON properties
                WHEN {$propCheckCondition}
                BEGIN
                    SELECT RAISE(ABORT, 'Property check constraint violation: financial or building integrity failed');
                END;
            ");

            DB::unprepared("
                CREATE TRIGGER trg_properties_check_upd BEFORE UPDATE ON properties
                WHEN {$propCheckCondition}
                BEGIN
                    SELECT RAISE(ABORT, 'Property check constraint violation: financial or building integrity failed');
                END;
            ");
        } elseif ($driver === 'pgsql') {
            // Moderation logs immutability
            DB::unprepared("
                CREATE OR REPLACE FUNCTION fn_moderation_logs_immutable_upd() RETURNS TRIGGER AS $$
                BEGIN
                    RAISE EXCEPTION 'moderation_logs records are append-only and cannot be updated';
                END;
                $$ LANGUAGE plpgsql;

                DROP TRIGGER IF EXISTS trg_moderation_logs_immutable_upd ON moderation_logs;
                CREATE TRIGGER trg_moderation_logs_immutable_upd BEFORE UPDATE ON moderation_logs
                FOR EACH ROW EXECUTE FUNCTION fn_moderation_logs_immutable_upd();

                CREATE OR REPLACE FUNCTION fn_moderation_logs_immutable_del() RETURNS TRIGGER AS $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM properties WHERE id = OLD.property_id) THEN
                        RAISE EXCEPTION 'moderation_logs records cannot be deleted while parent property exists';
                    END IF;
                    RETURN OLD;
                END;
                $$ LANGUAGE plpgsql;

                DROP TRIGGER IF EXISTS trg_moderation_logs_immutable_del ON moderation_logs;
                CREATE TRIGGER trg_moderation_logs_immutable_del BEFORE DELETE ON moderation_logs
                FOR EACH ROW EXECUTE FUNCTION fn_moderation_logs_immutable_del();
            ");

            // Category hierarchy enforcement on PostgreSQL (max 2 levels, property_type inheritance, cycle prevention)
            DB::unprepared("
                CREATE OR REPLACE FUNCTION fn_categories_enforce_hierarchy() RETURNS TRIGGER AS $$
                DECLARE
                    v_parent_parent_id BIGINT;
                    v_parent_type VARCHAR;
                BEGIN
                    IF NEW.parent_id IS NOT NULL THEN
                        IF TG_OP = 'UPDATE' AND NEW.parent_id = OLD.id THEN
                            RAISE EXCEPTION 'Category hierarchy violation: a category cannot be its own parent';
                        END IF;

                        IF TG_OP = 'UPDATE' AND EXISTS (
                            WITH RECURSIVE ancestors(id, parent_id) AS (
                                SELECT id, parent_id FROM categories WHERE id = NEW.parent_id
                                UNION
                                SELECT c.id, c.parent_id
                                FROM categories c
                                JOIN ancestors a ON c.id = a.parent_id
                                WHERE a.parent_id IS NOT NULL
                            )
                            SELECT 1 FROM ancestors WHERE id = OLD.id
                        ) THEN
                            RAISE EXCEPTION 'Category hierarchy violation: circular hierarchy detected';
                        END IF;

                        SELECT parent_id, property_type INTO v_parent_parent_id, v_parent_type
                        FROM categories WHERE id = NEW.parent_id;

                        IF NOT FOUND THEN
                            RAISE EXCEPTION 'Category hierarchy violation: parent category does not exist';
                        END IF;

                        IF v_parent_parent_id IS NOT NULL THEN
                            RAISE EXCEPTION 'Category hierarchy violation: subcategories cannot have grandchildren (max 2 levels)';
                        END IF;

                        IF v_parent_type <> NEW.property_type THEN
                            RAISE EXCEPTION 'Category hierarchy violation: child property_type must match parent property_type';
                        END IF;

                        IF TG_OP = 'UPDATE' AND OLD.parent_id IS NULL AND EXISTS (SELECT 1 FROM categories WHERE parent_id = OLD.id) THEN
                            RAISE EXCEPTION 'Category hierarchy violation: root category with children cannot be reparented';
                        END IF;
                    ELSE
                        IF TG_OP = 'UPDATE' AND OLD.property_type <> NEW.property_type AND EXISTS (
                            SELECT 1 FROM categories WHERE parent_id = OLD.id AND property_type <> NEW.property_type
                        ) THEN
                            RAISE EXCEPTION 'Category hierarchy violation: cannot change root property_type while incompatible children exist';
                        END IF;
                    END IF;

                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                DROP TRIGGER IF EXISTS trg_categories_enforce_hierarchy_ins ON categories;
                CREATE TRIGGER trg_categories_enforce_hierarchy_ins BEFORE INSERT ON categories
                FOR EACH ROW EXECUTE FUNCTION fn_categories_enforce_hierarchy();

                DROP TRIGGER IF EXISTS trg_categories_enforce_hierarchy_upd ON categories;
                CREATE TRIGGER trg_categories_enforce_hierarchy_upd BEFORE UPDATE ON categories
                FOR EACH ROW EXECUTE FUNCTION fn_categories_enforce_hierarchy();
            ");

            // Location hierarchy enforcement on PostgreSQL (Allowed-Parent Matrix + WITH RECURSIVE cycle prevention)
            DB::unprepared("
                CREATE OR REPLACE FUNCTION fn_locations_enforce_hierarchy() RETURNS TRIGGER AS $$
                DECLARE
                    v_parent_type VARCHAR;
                BEGIN
                    IF NEW.type = 'governorate' THEN
                        IF NEW.parent_id IS NOT NULL THEN
                            RAISE EXCEPTION 'Location hierarchy violation: governorate must have parent_id = NULL';
                        END IF;
                    ELSE
                        IF NEW.parent_id IS NULL THEN
                            RAISE EXCEPTION 'Location hierarchy violation: non-governorate location must have a parent_id';
                        END IF;

                        SELECT type INTO v_parent_type FROM locations WHERE id = NEW.parent_id;
                        IF NOT FOUND THEN
                            RAISE EXCEPTION 'Location hierarchy violation: parent location does not exist';
                        END IF;

                        IF (NEW.type = 'markaz' AND v_parent_type <> 'governorate')
                           OR (NEW.type = 'city' AND v_parent_type NOT IN ('governorate', 'markaz'))
                           OR (NEW.type = 'district' AND v_parent_type NOT IN ('city', 'markaz', 'governorate'))
                           OR (NEW.type = 'village' AND v_parent_type <> 'markaz') THEN
                            RAISE EXCEPTION 'Location hierarchy violation: invalid parent location type';
                        END IF;
                    END IF;

                    IF TG_OP = 'UPDATE' AND NEW.parent_id IS NOT NULL THEN
                        IF NEW.parent_id = OLD.id OR EXISTS (
                            WITH RECURSIVE ancestors(id, parent_id) AS (
                                SELECT id, parent_id FROM locations WHERE id = NEW.parent_id
                                UNION
                                SELECT l.id, l.parent_id
                                FROM locations l
                                JOIN ancestors a ON l.id = a.parent_id
                                WHERE a.parent_id IS NOT NULL
                            )
                            SELECT 1 FROM ancestors WHERE id = OLD.id
                        ) THEN
                            RAISE EXCEPTION 'Location hierarchy violation: circular hierarchy detected';
                        END IF;
                    END IF;

                    IF TG_OP = 'UPDATE' AND OLD.type <> NEW.type AND EXISTS (
                        SELECT 1 FROM locations c
                        WHERE c.parent_id = OLD.id
                        AND (
                            (c.type = 'governorate')
                            OR (c.type = 'markaz' AND NEW.type <> 'governorate')
                            OR (c.type = 'city' AND NEW.type NOT IN ('governorate', 'markaz'))
                            OR (c.type = 'district' AND NEW.type NOT IN ('city', 'markaz', 'governorate'))
                            OR (c.type = 'village' AND NEW.type <> 'markaz')
                        )
                    ) THEN
                        RAISE EXCEPTION 'Location hierarchy violation: incompatible existing child location for reclassified type';
                    END IF;

                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;

                DROP TRIGGER IF EXISTS trg_locations_enforce_hierarchy_ins ON locations;
                CREATE TRIGGER trg_locations_enforce_hierarchy_ins BEFORE INSERT ON locations
                FOR EACH ROW EXECUTE FUNCTION fn_locations_enforce_hierarchy();

                DROP TRIGGER IF EXISTS trg_locations_enforce_hierarchy_upd ON locations;
                CREATE TRIGGER trg_locations_enforce_hierarchy_upd BEFORE UPDATE ON locations
                FOR EACH ROW EXECUTE FUNCTION fn_locations_enforce_hierarchy();
            ");

            // Check constraints on PostgreSQL
            DB::statement("
                ALTER TABLE properties ADD CONSTRAINT chk_properties_financial_integrity CHECK (
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
            ");

            DB::statement("
                ALTER TABLE properties ADD CONSTRAINT chk_properties_building_integrity CHECK (
                    (total_floors IS NULL OR (total_floors >= 1 AND total_floors <= 100))
                    AND (floor_level IS NULL OR total_floors IS NULL OR floor_level <= total_floors)
                    AND (street_width_meters IS NULL OR (street_width_meters >= 1.00 AND street_width_meters <= 100.00))
                    AND (building_year IS NULL OR building_year >= 1800)
                )
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // ---------------------------------------------------------------------
        // Step 0: Conservative Preflight Refusal Gate (R5.4.2-A)
        // ---------------------------------------------------------------------
        if (Schema::hasTable('properties')) {
            // 1. Property data loss and baseline deviation guard
            $hasMeaningfulPropertyData = DB::table('properties')->where(function ($q) {
                $q->where(fn ($sub) => $sub->where('transaction_type', 'sale')
                                           ->where(fn ($s) => $s->whereNull('payment_method')->orWhere('payment_method', '!=', 'cash')))
                  ->orWhere(fn ($sub) => $sub->where('transaction_type', '!=', 'sale')->whereNotNull('payment_method'))
                  ->orWhere(fn ($sub) => $sub->where('transaction_type', 'rent')
                                             ->where(fn ($s) => $s->whereNull('rental_period')->orWhere('rental_period', '!=', 'monthly')))
                  ->orWhere(fn ($sub) => $sub->where('transaction_type', '!=', 'rent')->whereNotNull('rental_period'))
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
        }

        // 2. Category modifications and hierarchy guard
        if (Schema::hasTable('categories')) {
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
        }

        // 3. Location hierarchy, slug collisions, and modifications guard
        if (Schema::hasTable('locations')) {
            $duplicateSlugs = DB::table('locations')->select('slug')->groupBy('slug')->havingRaw('COUNT(*) > 1')->exists();
            if ($duplicateSlugs) {
                throw new \RuntimeException('Cannot rollback FND-04 migration: duplicate location slugs exist across parents, violating locations_slug_unique restoration.');
            }

            $newLocationIds = DB::table('locations')->whereIn('slug', ['sohag-governorate', 'markaz-sohag', 'new-akhmim'])->pluck('id');
            if ($newLocationIds->isNotEmpty()) {
                if (Schema::hasTable('properties') && DB::table('properties')->whereIn('location_id', $newLocationIds)->exists()) {
                    throw new \RuntimeException('Cannot rollback FND-04 migration: properties reference newly added hierarchy nodes (sohag-governorate, markaz-sohag, or new-akhmim).');
                }

                $allowedChildrenOfNewNodes = [
                    'markaz-sohag',
                    'new-akhmim',
                    'sohag-city',
                    'new-sohag',
                    'al-kawthar',
                    'akhmim',
                    'tahta',
                    'girga',
                    'al-maragha',
                    'tima',
                    'al-balyana',
                    'al-monshaah',
                    'saqalta',
                    'guhayna',
                    'dar-el-salam',
                ];

                $customChildren = DB::table('locations')
                    ->whereIn('parent_id', $newLocationIds)
                    ->whereNotIn('slug', $allowedChildrenOfNewNodes)
                    ->exists();
                if ($customChildren) {
                    throw new \RuntimeException('Cannot rollback FND-04 migration: custom child locations depend on the new hierarchy nodes.');
                }
            }

            $canonicalLocationTypes = [
                'sohag-governorate' => 'governorate',
                'markaz-sohag' => 'markaz',
                'new-akhmim' => 'city',
                'sohag-city' => 'city',
                'new-sohag' => 'city',
                'al-kawthar' => 'district',
                'akhmim' => 'markaz',
                'tahta' => 'markaz',
                'girga' => 'markaz',
                'al-maragha' => 'markaz',
                'tima' => 'markaz',
                'al-balyana' => 'markaz',
                'al-monshaah' => 'markaz',
                'saqalta' => 'markaz',
                'guhayna' => 'markaz',
                'dar-el-salam' => 'markaz',
                'hayy-sharq' => 'district',
                'hayy-gharb' => 'district',
                'al-zahraa' => 'district',
                'al-arqam' => 'district',
                'al-thaqafa' => 'district',
                '15th-street' => 'district',
                'al-gomhoreya' => 'district',
                'corniche-sharq' => 'district',
                'corniche-gharb' => 'district',
                'city-area' => 'district',
                'new-sohag-d1' => 'district',
                'new-sohag-d2' => 'district',
                'new-sohag-d3' => 'district',
                'new-sohag-villas' => 'district',
                'new-sohag-ebny-betak' => 'district',
                'new-sohag-nakheel' => 'district',
                'akhmim-city' => 'city',
                'akhmim-nida' => 'village',
                'akhmim-hawawish' => 'village',
                'tahta-city' => 'city',
                'sahel-tahta' => 'district',
                'girga-city' => 'city',
            ];

            $locations = DB::table('locations')->get();
            foreach ($locations as $loc) {
                if ($loc->type === null || !isset($canonicalLocationTypes[$loc->slug]) || $loc->type !== $canonicalLocationTypes[$loc->slug]) {
                    throw new \RuntimeException("Cannot rollback FND-04 migration: location '{$loc->slug}' has a modified, NULL, or custom administrative type.");
                }
            }
        }

        // 4. Reference sequence rewind guard
        if (Schema::hasTable('reference_sequences')) {
            $sequences = DB::table('reference_sequences')->get();
            foreach ($sequences as $seq) {
                $maxExisting = 0;
                if (Schema::hasTable('properties')) {
                    $maxExisting = (int) DB::table('properties')
                        ->where('reference_code', 'LIKE', "RES-{$seq->year}-%")
                        ->selectRaw("MAX(CAST(SUBSTR(reference_code, 10) AS INTEGER)) as max_seq")
                        ->value('max_seq');
                }
                if ($seq->current_sequence > $maxExisting) {
                    throw new \RuntimeException("Cannot rollback FND-04 migration: reference sequence for year {$seq->year} ({$seq->current_sequence}) exceeds maximum reconstructable property reference ({$maxExisting}).");
                }
            }
        }

        // ---------------------------------------------------------------------
        // Step 1: Drop triggers and database constraints
        // ---------------------------------------------------------------------
        $driver = DB::getDriverName();
        if ($driver === 'sqlite') {
            DB::statement('DROP TRIGGER IF EXISTS trg_moderation_logs_immutable_upd');
            DB::statement('DROP TRIGGER IF EXISTS trg_moderation_logs_immutable_del');
            DB::statement('DROP TRIGGER IF EXISTS trg_categories_enforce_hierarchy_ins');
            DB::statement('DROP TRIGGER IF EXISTS trg_categories_enforce_hierarchy_upd');
            DB::statement('DROP TRIGGER IF EXISTS trg_locations_enforce_hierarchy_ins');
            DB::statement('DROP TRIGGER IF EXISTS trg_locations_enforce_hierarchy_upd');
            DB::statement('DROP TRIGGER IF EXISTS trg_properties_check_ins');
            DB::statement('DROP TRIGGER IF EXISTS trg_properties_check_upd');
        } elseif ($driver === 'pgsql') {
            DB::statement('DROP TRIGGER IF EXISTS trg_moderation_logs_immutable_upd ON moderation_logs');
            DB::statement('DROP TRIGGER IF EXISTS trg_moderation_logs_immutable_del ON moderation_logs');
            DB::statement('DROP FUNCTION IF EXISTS fn_moderation_logs_immutable_upd');
            DB::statement('DROP FUNCTION IF EXISTS fn_moderation_logs_immutable_del');
            DB::statement('DROP TRIGGER IF EXISTS trg_categories_enforce_hierarchy_ins ON categories');
            DB::statement('DROP TRIGGER IF EXISTS trg_categories_enforce_hierarchy_upd ON categories');
            DB::statement('DROP FUNCTION IF EXISTS fn_categories_enforce_hierarchy');
            DB::statement('DROP TRIGGER IF EXISTS trg_locations_enforce_hierarchy_ins ON locations');
            DB::statement('DROP TRIGGER IF EXISTS trg_locations_enforce_hierarchy_upd ON locations');
            DB::statement('DROP FUNCTION IF EXISTS fn_locations_enforce_hierarchy');
            DB::statement('ALTER TABLE properties DROP CONSTRAINT IF EXISTS chk_properties_financial_integrity');
            DB::statement('ALTER TABLE properties DROP CONSTRAINT IF EXISTS chk_properties_building_integrity');
            DB::statement('ALTER TABLE reference_sequences DROP CONSTRAINT IF EXISTS chk_reference_sequences_bounds');
        }

        // ---------------------------------------------------------------------
        // Step 2: Restore 13 original Sohag roots and remove 3 new nodes
        // ---------------------------------------------------------------------
        if (Schema::hasTable('locations')) {
            $originalRoots = [
                'sohag-city', 'new-sohag', 'al-kawthar', 'akhmim', 'tahta', 'girga',
                'al-maragha', 'tima', 'al-balyana', 'al-monshaah', 'saqalta', 'guhayna', 'dar-el-salam'
            ];
            DB::table('locations')->whereIn('slug', $originalRoots)->update(['parent_id' => null]);
            DB::table('locations')->where('slug', 'new-akhmim')->delete();
            DB::table('locations')->where('slug', 'markaz-sohag')->delete();
            DB::table('locations')->where('slug', 'sohag-governorate')->delete();
        }

        // ---------------------------------------------------------------------
        // Step 3: Drop partial unique indexes on locations
        // ---------------------------------------------------------------------
        DB::statement('DROP INDEX IF EXISTS idx_locations_root_slug');
        DB::statement('DROP INDEX IF EXISTS idx_locations_child_slug');

        // ---------------------------------------------------------------------
        // Step 4: Revert locations schema
        // ---------------------------------------------------------------------
        if ($driver === 'sqlite') {
            DB::statement('PRAGMA foreign_keys = OFF');

            DB::statement("
                CREATE TABLE locations_temp (
                    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                    parent_id INTEGER NULL,
                    name_ar VARCHAR NOT NULL,
                    name_en VARCHAR NULL,
                    slug VARCHAR NOT NULL,
                    is_active TINYINT(1) NOT NULL DEFAULT 1,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    created_at DATETIME NULL,
                    updated_at DATETIME NULL,
                    FOREIGN KEY (parent_id) REFERENCES locations (id) ON DELETE SET NULL
                )
            ");

            DB::statement("
                INSERT INTO locations_temp (id, parent_id, name_ar, name_en, slug, is_active, sort_order, created_at, updated_at)
                SELECT id, parent_id, name_ar, name_en, slug, is_active, sort_order, created_at, updated_at
                FROM locations
            ");

            DB::statement('DROP TABLE locations');
            DB::statement('ALTER TABLE locations_temp RENAME TO locations');
            DB::statement('CREATE UNIQUE INDEX locations_slug_unique ON locations (slug)');
            DB::statement('PRAGMA foreign_keys = ON');
        } else {
            Schema::table('locations', function (Blueprint $table) {
                $table->dropForeign(['parent_id']);
                $table->foreign('parent_id')->references('id')->on('locations')->nullOnDelete();
                $table->dropColumn('type');
                $table->unique('slug', 'locations_slug_unique');
            });
        }

        // ---------------------------------------------------------------------
        // Step 5: Revert properties schema
        // ---------------------------------------------------------------------
        Schema::table('properties', function (Blueprint $table) {
            $table->dropIndex('idx_properties_search_composite');
            $table->dropColumn([
                'payment_method',
                'rental_period',
                'down_payment_egp',
                'installment_period_months',
                'insurance_deposit_egp',
                'total_floors',
                'building_year',
                'street_width_meters',
                'facade_type',
                'declared_legal_status',
                'has_elevator',
                'has_electricity_meter',
                'has_water_meter',
                'has_natural_gas',
            ]);
        });

        // ---------------------------------------------------------------------
        // Step 6: Revert categories schema
        // ---------------------------------------------------------------------
        Schema::table('categories', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropColumn(['parent_id', 'property_type', 'icon']);
        });

        // ---------------------------------------------------------------------
        // Step 7: Drop reference_sequences table
        // ---------------------------------------------------------------------
        Schema::dropIfExists('reference_sequences');
    }
};
