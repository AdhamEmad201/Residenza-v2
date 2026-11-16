<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('properties', 'installment_price_egp')) {
            Schema::table('properties', function (Blueprint $table) {
                $table->decimal('installment_price_egp', 14, 2)->nullable()->after('price_egp');
            });
        }

        // Backfill any existing cash_or_installment rows before installing stricter constraints
        DB::table('properties')
            ->where('transaction_type', 'sale')
            ->where('payment_method', 'cash_or_installment')
            ->whereNull('installment_price_egp')
            ->update([
                'installment_price_egp' => DB::raw('price_egp'),
            ]);

        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::statement('DROP TRIGGER IF EXISTS trg_properties_check_ins');
            DB::statement('DROP TRIGGER IF EXISTS trg_properties_check_upd');

            $propCheckCondition = $this->sqliteCheckCondition(withInstallmentPrice: true);

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
            DB::statement('ALTER TABLE properties DROP CONSTRAINT IF EXISTS chk_properties_financial_integrity');
            DB::statement($this->pgsqlFinancialConstraintSql(withInstallmentPrice: true));
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('properties', 'installment_price_egp')) {
            return;
        }

        // Conservative preflight: refuse rollback if any cash_or_installment row has diverged installment_price_egp
        $divergedCount = DB::table('properties')
            ->where('transaction_type', 'sale')
            ->where('payment_method', 'cash_or_installment')
            ->where(function ($query) {
                $query->whereNull('installment_price_egp')
                    ->orWhereColumn('installment_price_egp', '!=', 'price_egp');
            })
            ->count();

        if ($divergedCount > 0) {
            throw new \RuntimeException(
                "Cannot rollback DOM-01 migration: {$divergedCount} cash_or_installment properties have distinct installment_price_egp values."
            );
        }

        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            DB::statement('DROP TRIGGER IF EXISTS trg_properties_check_ins');
            DB::statement('DROP TRIGGER IF EXISTS trg_properties_check_upd');

            $propCheckCondition = $this->sqliteCheckCondition(withInstallmentPrice: false);

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
            DB::statement('ALTER TABLE properties DROP CONSTRAINT IF EXISTS chk_properties_financial_integrity');
            DB::statement($this->pgsqlFinancialConstraintSql(withInstallmentPrice: false));
        }

        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn('installment_price_egp');
        });
    }

    private function sqliteCheckCondition(bool $withInstallmentPrice): string
    {
        if ($withInstallmentPrice) {
            $cashBranch = "
                NEW.payment_method = 'cash'
                AND NEW.installment_price_egp IS NULL
                AND NEW.down_payment_egp IS NULL
                AND NEW.installment_period_months IS NULL
            ";
            $installmentBranch = "
                NEW.payment_method = 'installment'
                AND NEW.installment_price_egp IS NULL
                AND (NEW.down_payment_egp IS NULL OR (NEW.down_payment_egp >= 0 AND NEW.down_payment_egp < NEW.price_egp))
                AND (NEW.installment_period_months IS NOT NULL AND NEW.installment_period_months >= 1 AND NEW.installment_period_months <= 360)
            ";
            $bothBranch = "
                NEW.payment_method = 'cash_or_installment'
                AND NEW.installment_price_egp IS NOT NULL
                AND NEW.installment_price_egp > 0
                AND (NEW.down_payment_egp IS NULL OR (NEW.down_payment_egp >= 0 AND NEW.down_payment_egp < NEW.installment_price_egp))
                AND (NEW.installment_period_months IS NULL OR (NEW.installment_period_months >= 1 AND NEW.installment_period_months <= 360))
            ";
            $rentInstallmentNull = "AND NEW.installment_price_egp IS NULL";
        } else {
            $cashBranch = "
                NEW.payment_method = 'cash'
                AND NEW.down_payment_egp IS NULL
                AND NEW.installment_period_months IS NULL
            ";
            $installmentBranch = "
                NEW.payment_method = 'installment'
                AND (NEW.down_payment_egp IS NULL OR (NEW.down_payment_egp >= 0 AND NEW.down_payment_egp < NEW.price_egp))
                AND (NEW.installment_period_months IS NOT NULL AND NEW.installment_period_months >= 1 AND NEW.installment_period_months <= 360)
            ";
            $bothBranch = "
                NEW.payment_method = 'cash_or_installment'
                AND (NEW.down_payment_egp IS NULL OR (NEW.down_payment_egp >= 0 AND NEW.down_payment_egp < NEW.price_egp))
                AND (NEW.installment_period_months IS NULL OR (NEW.installment_period_months >= 1 AND NEW.installment_period_months <= 360))
            ";
            $rentInstallmentNull = "";
        }

        return "
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
                            ({$cashBranch})
                            OR ({$installmentBranch})
                            OR ({$bothBranch})
                        )
                    )
                    OR (
                        NEW.transaction_type = 'rent'
                        AND NEW.payment_method IS NULL
                        {$rentInstallmentNull}
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
    }

    private function pgsqlFinancialConstraintSql(bool $withInstallmentPrice): string
    {
        if ($withInstallmentPrice) {
            $cashBranch = "
                payment_method = 'cash'
                AND installment_price_egp IS NULL
                AND down_payment_egp IS NULL
                AND installment_period_months IS NULL
            ";
            $installmentBranch = "
                payment_method = 'installment'
                AND installment_price_egp IS NULL
                AND (down_payment_egp IS NULL OR (down_payment_egp >= 0 AND down_payment_egp < price_egp))
                AND (installment_period_months IS NOT NULL AND installment_period_months >= 1 AND installment_period_months <= 360)
            ";
            $bothBranch = "
                payment_method = 'cash_or_installment'
                AND installment_price_egp IS NOT NULL
                AND installment_price_egp > 0
                AND (down_payment_egp IS NULL OR (down_payment_egp >= 0 AND down_payment_egp < installment_price_egp))
                AND (installment_period_months IS NULL OR (installment_period_months >= 1 AND installment_period_months <= 360))
            ";
            $rentInstallmentNull = "AND installment_price_egp IS NULL";
        } else {
            $cashBranch = "
                payment_method = 'cash'
                AND down_payment_egp IS NULL
                AND installment_period_months IS NULL
            ";
            $installmentBranch = "
                payment_method = 'installment'
                AND (down_payment_egp IS NULL OR (down_payment_egp >= 0 AND down_payment_egp < price_egp))
                AND (installment_period_months IS NOT NULL AND installment_period_months >= 1 AND installment_period_months <= 360)
            ";
            $bothBranch = "
                payment_method = 'cash_or_installment'
                AND (down_payment_egp IS NULL OR (down_payment_egp >= 0 AND down_payment_egp < price_egp))
                AND (installment_period_months IS NULL OR (installment_period_months >= 1 AND installment_period_months <= 360))
            ";
            $rentInstallmentNull = "";
        }

        return "
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
                            ({$cashBranch})
                            OR ({$installmentBranch})
                            OR ({$bothBranch})
                        )
                    )
                    OR (
                        transaction_type = 'rent'
                        AND payment_method IS NULL
                        {$rentInstallmentNull}
                        AND down_payment_egp IS NULL
                        AND installment_period_months IS NULL
                        AND rental_period IS NOT NULL
                        AND rental_period IN ('monthly', 'quarterly', 'yearly', 'daily')
                        AND (insurance_deposit_egp IS NULL OR insurance_deposit_egp >= 0)
                    )
                )
            )
        ";
    }
};
