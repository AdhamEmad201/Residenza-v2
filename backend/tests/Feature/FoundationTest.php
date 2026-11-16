<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AccountType;
use App\Enums\AvailabilityStatus;
use App\Enums\DocumentType;
use App\Enums\FinishingType;
use App\Enums\ModerationStatus;
use App\Enums\TransactionType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use App\Modules\Media\Models\PropertyDocument;
use App\Modules\Media\Models\PropertyImage;
use App\Modules\Moderation\Models\ModerationLog;
use App\Modules\Property\Models\Property;
use App\Modules\Taxonomy\Models\Category;
use App\Modules\Taxonomy\Models\Location;
use Database\Seeders\AdminUserSeeder;
use Database\Seeders\SohagTaxonomySeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class FoundationTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_check_returns_success_envelope_and_verifies_database(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'service' => 'RESIDENZA API',
                    'version' => 'v1',
                    'status' => 'ok',
                    'database' => 'connected',
                ],
            ]);
    }

    public function test_sanctum_csrf_cookie_cors_and_cookie_configuration(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
        ])->get('/sanctum/csrf-cookie');

        $response->assertStatus(204);
        $response->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
        $response->assertHeader('Access-Control-Allow-Credentials', 'true');
        $response->assertCookie('XSRF-TOKEN');
        $response->assertCookie('residenza-session');

        $this->assertContains('localhost:3000', config('sanctum.stateful'));
        $this->assertEquals('residenza-session', config('session.cookie'));
        $this->assertNull(config('session.domain'));
        $this->assertTrue(config('cors.supports_credentials'));
    }

    public function test_centralized_api_exception_handling_404(): void
    {
        $response = $this->getJson('/api/v1/non-existent-route-for-testing');

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'error_code' => 'NOT_FOUND',
            ])
            ->assertHeader('Content-Type', 'application/json');
    }

    public function test_centralized_api_exception_handling_405(): void
    {
        $response = $this->deleteJson('/api/v1/health');

        $response->assertStatus(405)
            ->assertJson([
                'success' => false,
                'error_code' => 'METHOD_NOT_ALLOWED',
            ])
            ->assertHeader('Content-Type', 'application/json');
    }

    public function test_centralized_api_exception_handling_generic_500_never_leaks_details(): void
    {
        Route::get('/api/v1/test-unhandled-exception', function () {
            throw new \RuntimeException('Sensitive database connection credentials leaked');
        });

        $response = $this->getJson('/api/v1/test-unhandled-exception');

        $response->assertStatus(500)
            ->assertJson([
                'success' => false,
                'error_code' => 'INTERNAL_SERVER_ERROR',
                'message' => 'حدث خطأ غير متوقع في الخادم، يرجى المحاولة لاحقاً',
            ])
            ->assertHeader('Content-Type', 'application/json');

        $this->assertStringNotContainsString('Sensitive database connection credentials leaked', $response->getContent());
        $this->assertStringNotContainsString('<html>', $response->getContent());
    }

    public function test_centralized_api_exception_handling_preserves_client_http_exceptions(): void
    {
        Route::get('/api/v1/test-client-http-exception', function () {
            abort(400, 'طلب غير صالح للبيانات');
        });

        $response = $this->getJson('/api/v1/test-client-http-exception');

        $response->assertStatus(400)
            ->assertJson([
                'success' => false,
                'error_code' => 'HTTP_ERROR',
                'message' => 'طلب غير صالح للبيانات',
            ])
            ->assertHeader('Content-Type', 'application/json');
    }

    public function test_user_factory_generates_valid_schema_attributes(): void
    {
        $user = User::factory()->create();

        $this->assertNotNull($user->phone);
        $this->assertStringStartsWith('+2010', $user->phone);
        $this->assertEquals(UserRole::User, $user->role);
        $this->assertEquals(AccountType::Individual, $user->account_type);
        $this->assertEquals(UserStatus::Active, $user->status);

        $broker = User::factory()->broker('مكتب الصفوة')->create();
        $this->assertEquals(AccountType::Broker, $broker->account_type);
        $this->assertEquals('مكتب الصفوة', $broker->company_name);

        $company = User::factory()->company('شركة الصفا')->create();
        $this->assertEquals(AccountType::Company, $company->account_type);
        $this->assertEquals('شركة الصفا', $company->company_name);

        $admin = User::factory()->admin()->create();
        $this->assertEquals(UserRole::Admin, $admin->role);

        $suspended = User::factory()->suspended()->create();
        $this->assertEquals(UserStatus::Suspended, $suspended->status);
    }

    public function test_seeders_populate_admin_and_sohag_taxonomy(): void
    {
        $this->seed([
            AdminUserSeeder::class,
            SohagTaxonomySeeder::class,
        ]);

        // 1. Verify Admin User
        $admin = User::where('email', 'admin@residenza.eg')->first();
        $this->assertNotNull($admin);
        $this->assertEquals(UserRole::Admin, $admin->role);
        $this->assertEquals(AccountType::Admin, $admin->account_type);
        $this->assertTrue($admin->isAdmin());
        $this->assertTrue($admin->isActive());

        // 2. Verify Property Categories
        $categoriesCount = Category::count();
        $this->assertEquals(7, $categoriesCount);
        $this->assertDatabaseHas('categories', ['slug' => 'apartment', 'name_ar' => 'شقة سكنية']);

        // 3. Verify Sohag Locations Hierarchy
        $sohagGov = Location::where('slug', 'sohag-governorate')->first();
        $this->assertNotNull($sohagGov);
        $this->assertNull($sohagGov->parent_id);

        $markazSohag = Location::where('slug', 'markaz-sohag')->first();
        $this->assertNotNull($markazSohag);
        $this->assertEquals($sohagGov->id, $markazSohag->parent_id);

        $sohagCity = Location::where('slug', 'sohag-city')->first();
        $this->assertNotNull($sohagCity);
        $this->assertEquals($markazSohag->id, $sohagCity->parent_id);
        $this->assertGreaterThan(5, $sohagCity->children()->count());

        $hayySharq = Location::where('slug', 'hayy-sharq')->first();
        $this->assertNotNull($hayySharq);
        $this->assertEquals($sohagCity->id, $hayySharq->parent_id);
    }

    public function test_eloquent_relationships_for_property_domain(): void
    {
        $this->seed([
            AdminUserSeeder::class,
            SohagTaxonomySeeder::class,
        ]);

        $admin = User::where('email', 'admin@residenza.eg')->first();
        $category = Category::where('slug', 'apartment')->first();
        $location = Location::where('slug', 'hayy-sharq')->first();

        // Create Property
        $property = Property::unguarded(fn (): Property => Property::create([
            'reference_code' => 'RES-2026-00001',
            'slug' => 'luxury-apartment-sohag-res-2026-00001',
            'user_id' => $admin->id,
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale,
            'payment_method' => \App\Enums\PaymentMethod::Cash,
            'title_ar' => 'شقة فاخرة للبيع بحي الشرق',
            'description_ar' => 'شقة 180 متر تشطيب سوبر لوكس تطل على شارع رئيسي',
            'price_egp' => 2500000.00,
            'area_sqm' => 180.00,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'floor_level' => 4,
            'finishing_type' => FinishingType::SuperLux,
            'address_details_ar' => 'شارع 15 - برج الصفوة',
            'contact_phone' => '+201000000001',
            'contact_whatsapp' => '+201000000001',
            'moderation_status' => ModerationStatus::PendingReview,
            'availability_status' => AvailabilityStatus::Available,
        ]));

        // Attach Image
        $image = PropertyImage::create([
            'property_id' => $property->id,
            'disk' => 'public',
            'file_path' => 'properties/1/sample.jpg',
            'mime_type' => 'image/jpeg',
            'file_size_bytes' => 102400,
            'is_primary' => true,
            'sort_order' => 1,
        ]);

        // Attach Private Document
        $document = PropertyDocument::create([
            'property_id' => $property->id,
            'uploaded_by' => $admin->id,
            'document_type' => DocumentType::OwnershipProof,
            'disk' => 'private',
            'file_path' => 'property_documents/1/contract.pdf',
            'original_name' => 'عقد_الملكية.pdf',
            'mime_type' => 'application/pdf',
            'file_size_bytes' => 512000,
        ]);

        // Create Moderation Log
        $log = ModerationLog::create([
            'property_id' => $property->id,
            'actor_id' => $admin->id,
            'from_status' => null,
            'to_status' => ModerationStatus::PendingReview,
            'action' => 'submit',
            'notes' => 'تم تقديم العقار للمراجعة',
            'created_at' => now(),
        ]);

        // Assert relationships
        $this->assertEquals($admin->id, $property->user->id);
        $this->assertEquals($category->id, $property->category->id);
        $this->assertEquals($location->id, $property->location->id);
        $this->assertCount(1, $property->images);
        $this->assertTrue($property->primaryImage->is_primary);
        $this->assertCount(1, $property->documents);
        $this->assertEquals('private', $property->documents->first()->disk);
        $this->assertCount(1, $property->moderationLogs);
        $this->assertEquals(ModerationStatus::PendingReview, $property->moderationLogs->first()->to_status);
    }
}
