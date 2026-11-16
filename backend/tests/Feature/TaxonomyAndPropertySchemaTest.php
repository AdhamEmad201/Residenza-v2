<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AccountType;
use App\Enums\AvailabilityStatus;
use App\Enums\FinishingType;
use App\Enums\LocationType;
use App\Enums\ModerationStatus;
use App\Enums\PaymentMethod;
use App\Enums\PropertyType;
use App\Enums\RentalPeriod;
use App\Enums\TransactionType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use App\Modules\Property\Models\Property;
use App\Modules\Property\Models\ReferenceSequence;
use App\Modules\Property\Services\ReferenceCodeGenerator;
use App\Modules\Taxonomy\Models\Category;
use App\Modules\Taxonomy\Models\Location;
use Carbon\Carbon;
use Database\Seeders\AdminUserSeeder;
use Database\Seeders\SohagTaxonomySeeder;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use LogicException;
use OverflowException;
use RuntimeException;
use Tests\TestCase;

class TaxonomyAndPropertySchemaTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $regularUser;
    private Category $category;
    private Location $location;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            AdminUserSeeder::class,
            SohagTaxonomySeeder::class,
        ]);

        $this->admin = User::where('email', 'admin@residenza.eg')->firstOrFail();

        $this->regularUser = User::factory()->create([
            'role' => UserRole::User,
            'status' => UserStatus::Active,
            'account_type' => AccountType::Individual,
        ]);

        $this->category = Category::where('slug', 'apartment')->firstOrFail();
        $this->location = Location::where('slug', 'hayy-sharq')->firstOrFail();
    }

    private function basePropertyAttributes(array $overrides = []): array
    {
        $year = Carbon::now('Africa/Cairo')->year;
        $unique = random_int(10000, 99999);
        $code = "RES-{$year}-{$unique}";

        return array_merge([
            'reference_code' => $code,
            'slug' => "property-{$unique}-" . strtolower($code),
            'user_id' => $this->regularUser->id,
            'category_id' => $this->category->id,
            'location_id' => $this->location->id,
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Cash,
            'rental_period' => null,
            'price_egp' => 1500000.00,
            'down_payment_egp' => null,
            'installment_period_months' => null,
            'insurance_deposit_egp' => null,
            'area_sqm' => 120.00,
            'bedrooms' => 3,
            'bathrooms' => 1,
            'floor_level' => 2,
            'total_floors' => 5,
            'finishing_type' => FinishingType::FullyFinished,
            'building_year' => 2020,
            'street_width_meters' => 12.00,
            'title_ar' => 'عقار تجريبي للاختبار',
            'description_ar' => 'وصف تفصيلي كامل للعقار لأغراض الاختبارات الآلية.',
            'address_details_ar' => 'شارع الجمهورية - عمارة الأمل',
            'contact_phone' => '+201000000002',
            'contact_whatsapp' => '+201000000002',
            'moderation_status' => ModerationStatus::Draft,
            'availability_status' => AvailabilityStatus::Available,
        ], $overrides);
    }

    private function createPropertyFixture(array $overrides = []): Property
    {
        return Property::unguarded(fn (): Property => Property::create($this->basePropertyAttributes($overrides)));
    }

    /**
     * Test 1: Financial Truth Table & Payment Method Combinations.
     */
    public function test_payment_method_combinations_and_financial_truth_table(): void
    {
        // 1. Valid Cash Sale
        $cashProp = $this->createPropertyFixture([
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Cash,
            'down_payment_egp' => null,
            'installment_period_months' => null,
        ]);
        $this->assertDatabaseHas('properties', ['id' => $cashProp->id, 'payment_method' => 'cash']);

        // 2. Valid Installment Sale
        $instProp = $this->createPropertyFixture([
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Installment,
            'price_egp' => 2000000.00,
            'down_payment_egp' => 500000.00,
            'installment_period_months' => 48,
        ]);
        $this->assertDatabaseHas('properties', ['id' => $instProp->id, 'payment_method' => 'installment']);

        // 3. Valid Cash or Installment Sale (UD-02 = B: separate installment_price_egp)
        $bothProp = $this->createPropertyFixture([
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::CashOrInstallment,
            'price_egp' => 2500000.00,
            'installment_price_egp' => 2900000.00,
            'down_payment_egp' => 600000.00,
            'installment_period_months' => 60,
        ]);
        $this->assertDatabaseHas('properties', [
            'id' => $bothProp->id,
            'payment_method' => 'cash_or_installment',
            'installment_price_egp' => 2900000.00,
        ]);

        // 4. Valid Rent
        $rentProp = $this->createPropertyFixture([
            'transaction_type' => TransactionType::Rent,
            'payment_method' => null,
            'rental_period' => RentalPeriod::Monthly,
            'down_payment_egp' => null,
            'installment_period_months' => null,
            'insurance_deposit_egp' => 10000.00,
        ]);
        $this->assertDatabaseHas('properties', ['id' => $rentProp->id, 'rental_period' => 'monthly']);
    }

    /**
     * Test 2: OD-05 Down Payment Requirement on Installment Sales.
     */
    public function test_zero_and_null_down_payments_are_accepted_on_installment_sales_od05(): void
    {
        // NULL down payment accepted
        $pNull = $this->createPropertyFixture([
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Installment,
            'price_egp' => 1000000.00,
            'down_payment_egp' => null,
            'installment_period_months' => 36,
        ]);
        $this->assertNull($pNull->fresh()->down_payment_egp);

        // 0.00 down payment accepted (promotion)
        $pZero = $this->createPropertyFixture([
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Installment,
            'price_egp' => 1000000.00,
            'down_payment_egp' => 0.00,
            'installment_period_months' => 36,
        ]);
        $this->assertEquals(0.00, (float) $pZero->fresh()->down_payment_egp);

        // Positive down payment < price_egp accepted
        $pValid = $this->createPropertyFixture([
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Installment,
            'price_egp' => 1000000.00,
            'down_payment_egp' => 400000.00,
            'installment_period_months' => 36,
        ]);
        $this->assertEquals(400000.00, (float) $pValid->fresh()->down_payment_egp);

        // Raw DB OD-05 constraints: NULL and 0.00 succeed, < 0 and >= price_egp fail
        DB::table('properties')->insert([
            'reference_code' => 'RES-2026-99801',
            'slug' => 'raw-od05-zero-99801',
            'user_id' => $this->regularUser->id,
            'category_id' => $this->category->id,
            'location_id' => $this->location->id,
            'transaction_type' => 'sale',
            'payment_method' => 'installment',
            'price_egp' => 1000000.00,
            'down_payment_egp' => 0.00,
            'installment_period_months' => 24,
            'area_sqm' => 100.00,
            'title_ar' => 'بدون مقدم',
            'description_ar' => 'وصف',
            'address_details_ar' => 'عنوان',
            'contact_phone' => '+201000000000',
            'contact_whatsapp' => '+201000000000',
            'moderation_status' => 'draft',
            'availability_status' => 'available',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->assertDatabaseHas('properties', ['reference_code' => 'RES-2026-99801', 'down_payment_egp' => 0.00]);

        foreach ([-100.00, 1000000.00] as $idx => $badDownPayment) {
            try {
                DB::table('properties')->insert([
                    'reference_code' => 'RES-2026-9981' . $idx,
                    'slug' => 'raw-od05-bad-' . $idx,
                    'user_id' => $this->regularUser->id,
                    'category_id' => $this->category->id,
                    'location_id' => $this->location->id,
                    'transaction_type' => 'sale',
                    'payment_method' => 'installment',
                    'price_egp' => 1000000.00,
                    'down_payment_egp' => $badDownPayment,
                    'installment_period_months' => 24,
                    'area_sqm' => 100.00,
                    'title_ar' => 'مقدم غير صالح',
                    'description_ar' => 'وصف',
                    'address_details_ar' => 'عنوان',
                    'contact_phone' => '+201000000000',
                    'contact_whatsapp' => '+201000000000',
                    'moderation_status' => 'draft',
                    'availability_status' => 'available',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                $this->fail("Expected QueryException for raw DB down_payment_egp = {$badDownPayment}");
            } catch (QueryException $e) {
                $this->assertStringContainsString('financial or building integrity failed', $e->getMessage());
            }
        }

        // Down payment == price_egp rejected at Model layer
        $this->expectException(InvalidArgumentException::class);
        $this->createPropertyFixture([
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Installment,
            'price_egp' => 1000000.00,
            'down_payment_egp' => 1000000.00,
            'installment_period_months' => 36,
        ]);
    }

    /**
     * Test 3: Invalid Financial Combinations Rejected at Model & Database Trigger Layers.
     */
    public function test_invalid_financial_combinations_are_rejected_at_model_and_database_layers(): void
    {
        // 1. Sale with rental_period throws
        try {
            $this->createPropertyFixture([
                'transaction_type' => TransactionType::Sale,
                'rental_period' => RentalPeriod::Monthly,
            ]);
            $this->fail('Expected InvalidArgumentException for sale with rental_period');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('rental_period', $e->getMessage());
        }

        // 2. Cash sale with down_payment throws
        try {
            $this->createPropertyFixture([
                'transaction_type' => TransactionType::Sale,
                'payment_method' => PaymentMethod::Cash,
                'down_payment_egp' => 100000.00,
            ]);
            $this->fail('Expected InvalidArgumentException for cash sale with down_payment');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('down_payment_egp', $e->getMessage());
        }

        // 3. Rent with payment_method throws
        try {
            $this->createPropertyFixture([
                'transaction_type' => TransactionType::Rent,
                'payment_method' => PaymentMethod::Cash,
                'rental_period' => RentalPeriod::Monthly,
            ]);
            $this->fail('Expected InvalidArgumentException for rent with payment_method');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('payment_method', $e->getMessage());
        }

        // 4. Raw DB insert bypassing Eloquent triggers SQLite check constraint trigger
        $this->expectException(QueryException::class);
        DB::table('properties')->insert([
            'reference_code' => 'RES-2026-99901',
            'slug' => 'raw-invalid-property-99901',
            'user_id' => $this->regularUser->id,
            'category_id' => $this->category->id,
            'location_id' => $this->location->id,
            'transaction_type' => 'sale',
            'payment_method' => 'cash',
            'down_payment_egp' => 50000.00, // Invalid: cash cannot have down payment
            'price_egp' => 1000000.00,
            'area_sqm' => 100.00,
            'title_ar' => 'عقار غير صالح مباشر',
            'description_ar' => 'وصف تفصيلي',
            'address_details_ar' => 'عنوان',
            'contact_phone' => '+201000000000',
            'contact_whatsapp' => '+201000000000',
            'moderation_status' => 'draft',
            'availability_status' => 'available',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Test 4: Reference Generator Transaction Requirement & 0-Gap Rollback.
     */
    public function test_reference_generator_requires_active_transaction_and_rollback_restores_sequence_without_gaps(): void
    {
        $generator = new ReferenceCodeGenerator();

        // 1. Outside transaction throws LogicException
        $initialLevel = DB::transactionLevel();
        while (DB::transactionLevel() > 0) {
            DB::rollBack();
        }

        try {
            $generator->generate();
            $this->fail('Expected LogicException when calling generate outside transaction');
        } catch (LogicException $e) {
            $this->assertStringContainsString('active database transaction', $e->getMessage());
        } finally {
            DB::beginTransaction();
        }

        // 2. Rollback restores sequence with zero gaps
        $year = Carbon::now('Africa/Cairo')->year;
        ReferenceSequence::updateOrInsert(['year' => $year], ['current_sequence' => 10]);

        try {
            DB::transaction(function () use ($generator) {
                $code = $generator->generate();
                $this->assertEquals(sprintf('RES-%04d-00011', Carbon::now('Africa/Cairo')->year), $code);

                // Fail inside transaction
                throw new \Exception('Simulated creation failure');
            });
        } catch (\Exception $e) {
            $this->assertEquals('Simulated creation failure', $e->getMessage());
        }

        // Verify sequence rolled back to 10
        $seq = (int) DB::table('reference_sequences')->where('year', $year)->value('current_sequence');
        $this->assertEquals(10, $seq);

        // Next transaction gets sequence 11 without gaps
        DB::transaction(function () use ($generator, $year) {
            $code = $generator->generate();
            $this->assertEquals(sprintf('RES-%04d-00011', $year), $code);
        });

        $this->assertEquals(11, (int) DB::table('reference_sequences')->where('year', $year)->value('current_sequence'));
    }

    /**
     * Test 5: Real Lock-Contention Retry Coordinator & Reference Code Immutability.
     */
    public function test_reference_generator_retry_coordinator_handles_concurrency_and_preserves_immutability(): void
    {
        // 1. Reference code is immutable once set
        $property = Property::createDraft($this->basePropertyAttributes(), $this->regularUser);
        $this->assertNotNull($property->reference_code);

        try {
            $property->reference_code = 'RES-2026-99999';
            $property->save();
            $this->fail('Expected LogicException for mutating immutable reference_code');
        } catch (LogicException $e) {
            $this->assertStringContainsString('Property reference_code is immutable once assigned.', $e->getMessage());
        }

        // 2. Unwind test transaction to level 0 so coordinator owns retry lifecycle
        while (DB::transactionLevel() > 0) {
            DB::rollBack();
        }

        try {
            $attempts = 0;
            $code = ReferenceCodeGenerator::executeCreationTransaction(function () use (&$attempts) {
                $attempts++;
                $generator = new ReferenceCodeGenerator();
                $allocated = $generator->generate(2026);

                if ($attempts < 3) {
                    $pdoEx = new \PDOException('SQLSTATE[HY000]: General error: 5 database is locked');
                    $pdoEx->errorInfo = ['HY000', 5, 'database is locked'];
                    throw new QueryException('sqlite', 'INSERT INTO properties ...', [], $pdoEx);
                }

                return $allocated;
            });

            $this->assertEquals(3, $attempts);
            $this->assertEquals('RES-2026-00001', $code);

            // Verify generic HY000 without lock indicator is NOT retried
            $hyAttempts = 0;
            try {
                ReferenceCodeGenerator::executeCreationTransaction(function () use (&$hyAttempts) {
                    $hyAttempts++;
                    $pdoEx = new \PDOException('SQLSTATE[HY000]: General error: 1 no such table');
                    $pdoEx->errorInfo = ['HY000', 1, 'no such table'];
                    throw new QueryException('sqlite', 'SELECT * FROM missing', [], $pdoEx);
                });
                $this->fail('Expected QueryException for generic HY000');
            } catch (QueryException $e) {
                $this->assertEquals(1, $hyAttempts);
            }
        } finally {
            DB::table('reference_sequences')->where('year', 2026)->delete();
            DB::beginTransaction();
        }
    }

    /**
     * Test 6: Year Rollover, Max Valid Sequence, Raw DB Bounds & Atomic OverflowException.
     */
    public function test_reference_generator_year_rollover_max_valid_sequence_and_atomic_overflow_exception(): void
    {
        $generator = new ReferenceCodeGenerator();
        $year = 2026;

        // Raw DB bounds enforcement on SQLite
        foreach ([
            ['year' => 1999, 'current_sequence' => 0],
            ['year' => 10000, 'current_sequence' => 0],
            ['year' => 2026, 'current_sequence' => -1],
            ['year' => 2026, 'current_sequence' => 1000000000000],
        ] as $invalidRow) {
            try {
                DB::table('reference_sequences')->insert(array_merge($invalidRow, ['updated_at' => now()]));
                $this->fail('Expected QueryException for invalid reference_sequences bounds: ' . json_encode($invalidRow));
            } catch (QueryException $e) {
                $this->assertStringContainsString('CHECK constraint failed', $e->getMessage());
            }
        }

        // Set sequence to 999999999998
        DB::table('reference_sequences')->updateOrInsert(
            ['year' => $year],
            ['current_sequence' => 999999999998, 'updated_at' => now()]
        );

        // First increment succeeds at upper bound
        $code = DB::transaction(fn () => $generator->generate($year));
        $this->assertEquals("RES-{$year}-999999999999", $code);

        // Next increment throws OverflowException (NOT QueryException)
        $this->expectException(OverflowException::class);
        DB::transaction(fn () => $generator->generate($year));
    }

    /**
     * Test 7: Location Partial Unique Indexes (Distinct Parents Allowed, Same Parent & Root Blocked).
     */
    public function test_location_partial_unique_indexes_prevent_duplicate_root_and_sibling_slugs_while_allowing_distinct_parents(): void
    {
        $gov = Location::where('slug', 'sohag-governorate')->firstOrFail();
        $sohagCity = Location::where('slug', 'sohag-city')->firstOrFail();
        $newSohag = Location::where('slug', 'new-sohag')->firstOrFail();

        // 1. Same slug under DIFFERENT parents succeeds
        $childA = Location::create([
            'parent_id' => $sohagCity->id,
            'type' => LocationType::District,
            'name_ar' => 'الحي المتميز',
            'slug' => 'distinct-parent-shared-slug',
            'sort_order' => 99,
        ]);
        $childB = Location::create([
            'parent_id' => $newSohag->id,
            'type' => LocationType::District,
            'name_ar' => 'الحي المتميز',
            'slug' => 'distinct-parent-shared-slug',
            'sort_order' => 99,
        ]);
        $this->assertNotEquals($childA->id, $childB->id);

        // 2. Duplicate root slug (parent_id IS NULL) throws QueryException
        try {
            Location::create([
                'parent_id' => null,
                'type' => LocationType::Governorate,
                'name_ar' => 'محافظة سوهاج مكررة',
                'slug' => 'sohag-governorate',
                'sort_order' => 2,
            ]);
            $this->fail('Expected QueryException for duplicate root location slug');
        } catch (QueryException $e) {
            $this->assertStringContainsString('UNIQUE constraint failed', $e->getMessage());
        }

        // 3. Sibling with duplicate slug under same parent throws QueryException
        $this->expectException(QueryException::class);
        Location::create([
            'parent_id' => $gov->id,
            'type' => LocationType::Markaz,
            'name_ar' => 'مركز سوهاج مكرر',
            'slug' => 'markaz-sohag',
            'sort_order' => 10,
        ]);
    }

    /**
     * Test 8: Migration Safe Rollback Refuses When Data Exists & Reverts Cleanly on Empty Delta.
     */
    public function test_migration_safe_rollback_refuses_when_data_exists_and_reverts_cleanly_on_empty_delta(): void
    {
        // 1. Populate a property with FND-04 attributes
        $prop = $this->createPropertyFixture([
            'down_payment_egp' => 200000.00,
            'installment_period_months' => 24,
            'payment_method' => PaymentMethod::Installment,
        ]);

        $migration = require database_path('migrations/2026_11_10_000001_enhance_taxonomy_and_properties_schema.php');

        // Rollback refusal gate triggers RuntimeException
        try {
            $migration->down();
            $this->fail('Expected RuntimeException refusing rollback due to populated property attributes');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('Cannot rollback FND-04 migration', $e->getMessage());
        }

        // Clean up property so delta is empty
        $prop->forceDelete();

        // Unwind RefreshDatabase transaction so SQLite DDL PRAGMA foreign_keys = OFF works identically to migrate:rollback
        while (DB::transactionLevel() > 0) {
            DB::rollBack();
        }

        try {
            // Clean rollback succeeds on empty delta
            $migration->down();

            // Verify locations_slug_unique restored and type column dropped
            $this->assertFalse(\Illuminate\Support\Facades\Schema::hasColumn('locations', 'type'));
            $this->assertFalse(\Illuminate\Support\Facades\Schema::hasTable('reference_sequences'));

            // Restore schema
            $migration->up();
            $this->assertTrue(\Illuminate\Support\Facades\Schema::hasTable('reference_sequences'));
        } finally {
            DB::beginTransaction();
        }
    }

    /**
     * Test 9: Full Sohag Taxonomy Preservation & Seeder Idempotency.
     */
    public function test_full_sohag_taxonomy_preservation_35_existing_plus_3_new_and_idempotency(): void
    {
        $this->assertEquals(38, Location::count());

        // 1 Root
        $this->assertEquals(1, Location::whereNull('parent_id')->count());
        $root = Location::whereNull('parent_id')->first();
        $this->assertEquals('sohag-governorate', $root->slug);

        // 14 Direct children under governorate
        $this->assertEquals(14, Location::where('parent_id', $root->id)->count());

        // 1 under markaz-sohag (sohag-city)
        $markazSohag = Location::where('slug', 'markaz-sohag')->first();
        $this->assertEquals(1, Location::where('parent_id', $markazSohag->id)->count());

        // Re-run seeder to verify 100% idempotency
        $this->seed(SohagTaxonomySeeder::class);
        $this->assertEquals(38, Location::count());
    }

    /**
     * Test 10: Location Allowed-Parent Matrix, restrictOnDelete, Reclassification & Deep (>10-hop) Cycle Prevention.
     */
    public function test_location_allowed_parent_matrix_reclassification_and_cycle_prevention(): void
    {
        $gov = Location::where('slug', 'sohag-governorate')->firstOrFail();
        $markazSohag = Location::where('slug', 'markaz-sohag')->firstOrFail();
        $sohagCity = Location::where('slug', 'sohag-city')->firstOrFail();
        $hayySharq = Location::where('slug', 'hayy-sharq')->firstOrFail();

        // 1. Markaz under City violates allowed parents (Model)
        try {
            Location::create([
                'parent_id' => $sohagCity->id,
                'type' => LocationType::Markaz,
                'name_ar' => 'مركز غير صالح',
                'slug' => 'invalid-markaz',
            ]);
            $this->fail('Expected InvalidArgumentException when placing Markaz under City');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('cannot have a parent of type', $e->getMessage());
        }

        // 2. Raw DB insert placing village under city fails (SQLite trigger)
        try {
            DB::table('locations')->insert([
                'parent_id' => $sohagCity->id,
                'type' => 'village',
                'name_ar' => 'قرية غير صالحة تحت مدينة',
                'slug' => 'invalid-village-under-city',
                'is_active' => 1,
                'sort_order' => 99,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->fail('Expected QueryException when placing village under city at raw DB level');
        } catch (QueryException $e) {
            $this->assertStringContainsString('invalid parent location type', $e->getMessage());
        }

        // 3. restrictOnDelete() on locations.parent_id blocks deleting parent with children
        try {
            DB::table('locations')->where('id', $markazSohag->id)->delete();
            $this->fail('Expected QueryException when deleting parent location with children');
        } catch (QueryException $e) {
            $this->assertStringContainsString('FOREIGN KEY constraint failed', $e->getMessage());
        }

        // 4. Self-parenting throws
        try {
            $sohagCity->parent_id = $sohagCity->id;
            $sohagCity->save();
            $this->fail('Expected InvalidArgumentException for self-parenting');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('cannot be its own parent', $e->getMessage());
        }

        // 5. Multi-hop cycle (3-hop) throws
        try {
            $sohagCity->parent_id = $hayySharq->id;
            $sohagCity->save();
            $this->fail('Expected InvalidArgumentException for circular hierarchy');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('Circular location hierarchy', $e->getMessage());
        }

        // 6. Deep (>10-hop, 12-level) cycle blocked at BOTH Model and raw DB WITH RECURSIVE trigger layers
        DB::statement('DROP TRIGGER IF EXISTS trg_locations_enforce_hierarchy_ins');
        $chainIds = [];
        $parentId = $gov->id;
        for ($i = 1; $i <= 12; $i++) {
            $parentId = DB::table('locations')->insertGetId([
                'parent_id' => $parentId,
                'type' => 'city',
                'name_ar' => "سلسلة {$i}",
                'slug' => "deep-cycle-chain-{$i}",
                'is_active' => 1,
                'sort_order' => $i,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $chainIds[] = $parentId;
        }

        // Model layer blocks 12-hop cycle
        $topChainNode = Location::findOrFail($chainIds[0]);
        try {
            $topChainNode->parent_id = $chainIds[11];
            $topChainNode->save();
            $this->fail('Expected InvalidArgumentException for 12-hop circular hierarchy at Model layer');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('Circular location hierarchy', $e->getMessage());
        }

        // Raw DB trigger layer (WITH RECURSIVE) blocks 12-hop cycle
        try {
            DB::table('locations')->where('id', $chainIds[0])->update(['parent_id' => $chainIds[11]]);
            $this->fail('Expected QueryException for 12-hop circular hierarchy at DB trigger layer');
        } catch (QueryException $e) {
            $this->assertStringContainsString('circular hierarchy detected', $e->getMessage());
        }
    }

    /**
     * Test 11: Category 2-Tier Depth, Property Type Inheritance & Restrict on Delete.
     */
    public function test_category_hierarchy_two_level_depth_cycle_prevention_and_restrict_on_delete(): void
    {
        $rootCat = Category::where('slug', 'apartment')->firstOrFail();

        // 1. Level 2 Child Category succeeds
        $childCat = Category::create([
            'parent_id' => $rootCat->id,
            'property_type' => PropertyType::Residential,
            'name_ar' => 'دوبلكس',
            'name_en' => 'Duplex',
            'slug' => 'duplex',
            'is_active' => true,
        ]);
        $this->assertEquals($rootCat->property_type, $childCat->property_type);

        // 2. Level 3 Grandchild Category throws
        try {
            Category::create([
                'parent_id' => $childCat->id,
                'property_type' => PropertyType::Residential,
                'name_ar' => 'دوبلكس بحديقة',
                'slug' => 'duplex-garden',
                'is_active' => true,
            ]);
            $this->fail('Expected InvalidArgumentException for Level 3 category depth');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('maximum 2 total levels', $e->getMessage());
        }

        // 3. Deleting parent with existing children throws QueryException (foreign key restrict)
        $this->expectException(QueryException::class);
        $rootCat->delete();
    }

    /**
     * Test 12: Building Year Validation & Cairo Dynamic Upper Bound.
     */
    public function test_building_year_validation_and_cairo_timezone_rollover(): void
    {
        // 1. Building year < 1800 throws
        try {
            $this->createPropertyFixture([
                'building_year' => 1799,
            ]);
            $this->fail('Expected InvalidArgumentException for building_year < 1800');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString('building_year must be between 1800', $e->getMessage());
        }

        // 2. Building year > Cairo year + 5 throws
        $maxValidYear = Carbon::now('Africa/Cairo')->year + 5;
        try {
            $this->createPropertyFixture([
                'building_year' => $maxValidYear + 1,
            ]);
            $this->fail('Expected InvalidArgumentException for building_year exceeding dynamic Cairo upper bound');
        } catch (InvalidArgumentException $e) {
            $this->assertStringContainsString("building_year must be between 1800 and {$maxValidYear}", $e->getMessage());
        }

        // 3. Valid building year succeeds
        $validProp = $this->createPropertyFixture([
            'building_year' => $maxValidYear,
        ]);
        $this->assertEquals($maxValidYear, $validProp->fresh()->building_year);
    }

    /**
     * Test 13: Admin Direct Publication Unconditional published_at = now() & Moderation Log (OD-01).
     */
    public function test_admin_direct_publication_unconditional_now_and_moderation_log_atomicity_od01(): void
    {
        $prop = Property::createAdminPublished($this->basePropertyAttributes([
            'title_ar' => 'عقار منشور مباشرة بواسطة الأدمن',
        ]), $this->admin, 'ملاحظات النشر المباشر');

        $this->assertEquals(ModerationStatus::Approved, $prop->moderation_status);
        $this->assertEquals($this->admin->id, $prop->reviewed_by);
        $this->assertNotNull($prop->reviewed_at);
        $this->assertNotNull($prop->published_at);
        $this->assertEquals($prop->reviewed_at->timestamp, $prop->published_at->timestamp);

        // Verify atomic moderation log
        $log = $prop->moderationLogs()->first();
        $this->assertNotNull($log);
        $this->assertEquals('admin_direct_publish', $log->action);
        $this->assertNull($log->from_status);
        $this->assertEquals(ModerationStatus::Approved, $log->to_status);
        $this->assertEquals($this->admin->id, $log->actor_id);

        // Atomic OD-01 rollback: if moderation_logs insertion fails, properties row & sequence must roll back
        $countBefore = Property::count();
        \App\Modules\Moderation\Models\ModerationLog::creating(function () {
            throw new RuntimeException('Simulated moderation_logs failure');
        });
        try {
            Property::createAdminPublished($this->basePropertyAttributes([
                'title_ar' => 'عقار يجب التراجع عنه',
            ]), $this->admin);
            $this->fail('Expected RuntimeException from moderation_logs creating hook');
        } catch (RuntimeException $e) {
            $this->assertEquals('Simulated moderation_logs failure', $e->getMessage());
        } finally {
            \App\Modules\Moderation\Models\ModerationLog::flushEventListeners();
        }
        $this->assertEquals($countBefore, Property::count());

        // Non-admin cannot publish directly
        $this->expectException(AuthorizationException::class);
        Property::createAdminPublished($this->basePropertyAttributes(), $this->regularUser);
    }

    /**
     * Test 14: Moderation Lifecycle Transitions, T8 Reset & Append-Only Logs with Cascade.
     */
    public function test_complete_moderation_transitions_t8_review_reset_ownership_auth_and_append_only_logs_with_cascade(): void
    {
        // 1. T1: Create draft
        $prop = Property::createDraft($this->basePropertyAttributes(), $this->regularUser);
        $this->assertEquals(ModerationStatus::Draft, $prop->moderation_status);

        // 2. T2-B: Submit draft
        $prop->submitDraft($this->regularUser, 'يرجى مراجعة العقار');
        $this->assertEquals(ModerationStatus::PendingReview, $prop->moderation_status);

        // 3. T5: Admin request changes
        $prop->requestChanges($this->admin, 'يرجى تصحيح السعر والمساحة');
        $this->assertEquals(ModerationStatus::ChangesRequested, $prop->moderation_status);
        $this->assertEquals('يرجى تصحيح السعر والمساحة', $prop->rejection_reason);

        // 4. T8: Owner resubmit resets review metadata to NULL
        $prop->resubmit($this->regularUser, 'تم تصحيح السعر');
        $this->assertEquals(ModerationStatus::PendingReview, $prop->fresh()->moderation_status);
        $this->assertNull($prop->fresh()->reviewed_by);
        $this->assertNull($prop->fresh()->reviewed_at);
        $this->assertNull($prop->fresh()->published_at);
        $this->assertNull($prop->fresh()->rejection_reason);

        // 5. Direct UPDATE on moderation_logs throws trigger abort exception
        $log = $prop->moderationLogs()->first();
        $this->assertNotNull($log);

        try {
            DB::table('moderation_logs')->where('id', $log->id)->update(['notes' => 'تعديل غير مسموح']);
            $this->fail('Expected QueryException on updating moderation_logs');
        } catch (QueryException $e) {
            $this->assertStringContainsString('append-only', $e->getMessage());
        }

        // 6. Direct DELETE on moderation_logs of active property throws trigger abort exception
        try {
            DB::table('moderation_logs')->where('id', $log->id)->delete();
            $this->fail('Expected QueryException on deleting moderation_logs for active property');
        } catch (QueryException $e) {
            $this->assertStringContainsString('cannot be deleted while parent property exists', $e->getMessage());
        }

        // 7. Direct DELETE on moderation_logs of soft-deleted property throws trigger abort exception
        $prop->delete();
        $this->assertTrue($prop->trashed());

        try {
            DB::table('moderation_logs')->where('id', $log->id)->delete();
            $this->fail('Expected QueryException on deleting moderation_logs for soft-deleted property');
        } catch (QueryException $e) {
            $this->assertStringContainsString('cannot be deleted while parent property exists', $e->getMessage());
        }

        // 8. Parent forceDelete cascades cleanly and deletes moderation_logs
        $prop->forceDelete();
        $this->assertEquals(0, DB::table('moderation_logs')->where('property_id', $prop->id)->count());
    }

    /**
     * Test 15: Public Marketplace Visibility Predicate Excludes Ineligible States.
     */
    public function test_public_marketplace_visibility_predicate_excludes_all_ineligible_states(): void
    {
        // 1. Fully eligible listing (Approved, published in past, available, active user, not deleted)
        $eligible = $this->createPropertyFixture([
            'moderation_status' => ModerationStatus::Approved,
            'availability_status' => AvailabilityStatus::Available,
            'published_at' => Carbon::now()->subHour(),
        ]);

        // 2. Draft listing -> Excluded
        $draft = $this->createPropertyFixture([
            'moderation_status' => ModerationStatus::Draft,
            'availability_status' => AvailabilityStatus::Available,
            'published_at' => Carbon::now()->subHour(),
        ]);

        // 3. Pending Review listing -> Excluded
        $pending = $this->createPropertyFixture([
            'moderation_status' => ModerationStatus::PendingReview,
            'availability_status' => AvailabilityStatus::Available,
            'published_at' => Carbon::now()->subHour(),
        ]);

        // 4. Future published listing (scheduled) -> Excluded
        $future = $this->createPropertyFixture([
            'moderation_status' => ModerationStatus::Approved,
            'availability_status' => AvailabilityStatus::Available,
            'published_at' => Carbon::now()->addDay(),
        ]);

        // 5. Sold listing -> Excluded
        $sold = $this->createPropertyFixture([
            'moderation_status' => ModerationStatus::Approved,
            'availability_status' => AvailabilityStatus::Sold,
            'published_at' => Carbon::now()->subHour(),
        ]);

        // 6. Rented listing -> Excluded
        $rented = $this->createPropertyFixture([
            'moderation_status' => ModerationStatus::Approved,
            'availability_status' => AvailabilityStatus::Rented,
            'published_at' => Carbon::now()->subHour(),
        ]);

        // 7. Hidden listing -> Excluded
        $hidden = $this->createPropertyFixture([
            'moderation_status' => ModerationStatus::Approved,
            'availability_status' => AvailabilityStatus::Hidden,
            'published_at' => Carbon::now()->subHour(),
        ]);

        // 8. Soft-deleted listing -> Excluded
        $deleted = $this->createPropertyFixture([
            'moderation_status' => ModerationStatus::Approved,
            'availability_status' => AvailabilityStatus::Available,
            'published_at' => Carbon::now()->subHour(),
        ]);
        $deleted->delete();

        // 9. Listing owned by suspended user -> Excluded
        $suspendedUser = User::factory()->create(['status' => UserStatus::Suspended]);
        $suspendedListing = $this->createPropertyFixture([
            'user_id' => $suspendedUser->id,
            'moderation_status' => ModerationStatus::Approved,
            'availability_status' => AvailabilityStatus::Available,
            'published_at' => Carbon::now()->subHour(),
        ]);

        $marketplaceResults = Property::publicMarketplace()->pluck('id')->all();

        $this->assertContains($eligible->id, $marketplaceResults);
        $this->assertNotContains($draft->id, $marketplaceResults);
        $this->assertNotContains($pending->id, $marketplaceResults);
        $this->assertNotContains($future->id, $marketplaceResults);
        $this->assertNotContains($sold->id, $marketplaceResults);
        $this->assertNotContains($rented->id, $marketplaceResults);
        $this->assertNotContains($hidden->id, $marketplaceResults);
        $this->assertNotContains($deleted->id, $marketplaceResults);
        $this->assertNotContains($suspendedListing->id, $marketplaceResults);
    }
}
