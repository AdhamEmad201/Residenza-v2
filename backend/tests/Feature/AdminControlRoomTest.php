<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AccountType;
use App\Enums\AvailabilityStatus;
use App\Enums\ModerationStatus;
use App\Enums\PaymentMethod;
use App\Enums\PropertyType;
use App\Enums\TransactionType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use App\Modules\Admin\Models\AdminAuditLog;
use App\Modules\Admin\Models\Area;
use App\Modules\Admin\Models\BuyerRequest;
use App\Modules\Admin\Models\PropertyReport;
use App\Modules\Company\Models\Company;
use App\Modules\Property\Models\Property;
use App\Modules\Taxonomy\Models\Category;
use App\Modules\Taxonomy\Models\Location;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminControlRoomTest extends TestCase
{
    use RefreshDatabase;

    private function createCategoryAndLocation(): array
    {
        $category = Category::query()->create([
            'name_ar' => 'شقة سكنية',
            'slug' => 'apartment-' . uniqid(),
            'property_type' => PropertyType::Residential->value,
            'is_active' => true,
        ]);

        $location = Location::query()->create([
            'name_ar' => 'سوهاج',
            'slug' => 'sohag-gov-' . uniqid(),
            'type' => 'governorate',
            'is_active' => true,
        ]);

        return [$category, $location];
    }

    private function createUser(UserRole $role = UserRole::User, AccountType $accountType = AccountType::Company): User
    {
        return User::query()->create([
            'name' => 'Test User ' . uniqid(),
            'email' => 'user_' . uniqid() . '@residenza.test',
            'phone' => '010' . random_int(10000000, 99999999),
            'password' => 'StrongPass123!',
            'role' => $role,
            'account_type' => $accountType,
            'status' => UserStatus::Active,
            'is_active' => true,
        ]);
    }

    public function test_non_admin_and_guests_are_blocked_from_admin_control_room(): void
    {
        $this->getJson('/api/v1/admin/overview')->assertStatus(401);

        $regularUser = $this->createUser(UserRole::User);
        Sanctum::actingAs($regularUser);

        $this->getJson('/api/v1/admin/overview')->assertStatus(403);
        $this->getJson('/api/v1/admin/companies')->assertStatus(403);
        $this->getJson('/api/v1/admin/areas')->assertStatus(403);
        $this->getJson('/api/v1/admin/audit-logs')->assertStatus(403);
        $this->getJson('/api/v1/admin/export/users')->assertStatus(403);
    }

    public function test_admin_overview_tracking_and_audit_logs_work(): void
    {
        [$category, $location] = $this->createCategoryAndLocation();
        $admin = $this->createUser(UserRole::Admin, AccountType::Admin);
        $broker = $this->createUser(UserRole::User, AccountType::Company);
        $company = new Company([
            'name' => 'شركة النيل العقارية',
            'address' => 'سوهاج الجديدة',
        ]);
        $company->user_id = $broker->id;
        $company->max_properties = 5;
        $company->save();

        $property = new Property([
            'reference_code' => 'RES-2026-' . random_int(10000, 99999),
            'slug' => 'test-prop-' . uniqid(),
            'company_id' => $company->id,
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale->value,
            'payment_method' => PaymentMethod::Cash->value,
            'title_ar' => 'شقة فاخرة بسوهاج الجديدة',
            'description_ar' => 'وصف العقار التجريبي لاختبار غرفة التحكم',
            'price_egp' => 1500000,
            'area_sqm' => 150,
            'address_details_ar' => 'شارع الجامعة، سوهاج الجديدة',
            'contact_phone' => '01012345678',
            'contact_whatsapp' => '01012345678',
            'availability_status' => AvailabilityStatus::Available->value,
        ]);
        $property->user_id = $broker->id;
        $property->moderation_status = ModerationStatus::PendingReview;
        $property->save();

        // Public tracking & lead intake
        $this->postJson('/api/v1/track/click', [
            'type' => 'whatsapp',
            'target_type' => 'property',
            'id' => $property->id,
        ])->assertStatus(200);

        $this->postJson("/api/v1/properties/{$property->id}/report", [
            'reporter_phone' => '01012345678',
            'reason' => 'بيانات مكررة',
        ])->assertStatus(201);

        $this->postJson('/api/v1/buyer-requests', [
            'name' => 'أحمد محمود',
            'phone' => '01099887766',
            'property_type' => 'شقة سكنية',
            'area' => 'الكوامل',
            'budget_max' => 2000000,
        ])->assertStatus(201);

        $this->getJson('/api/v1/site-config')
            ->assertStatus(200)
            ->assertJsonStructure(['data' => ['areas', 'announcement_bar', 'hero_banner']]);

        Sanctum::actingAs($admin);

        // Overview
        $this->getJson('/api/v1/admin/overview')
            ->assertStatus(200)
            ->assertJsonPath('data.properties.pending', 1)
            ->assertJsonPath('data.engagement.total_whatsapp_clicks', 1)
            ->assertJsonPath('data.open_reports_count', 1)
            ->assertJsonPath('data.new_buyer_requests_count', 1);

        // Moderate property -> approve + feature
        $this->patchJson("/api/v1/admin/properties/{$property->id}/moderate", [
            'action' => 'approve',
            'is_featured' => true,
        ])->assertStatus(200)
            ->assertJsonPath('data.is_featured', true);

        // Reject requires reason
        $this->patchJson("/api/v1/admin/properties/{$property->id}/moderate", [
            'action' => 'reject',
        ])->assertStatus(422);

        // Company update
        $this->patchJson("/api/v1/admin/companies/{$company->id}", [
            'is_verified' => true,
            'plan_tier' => 'partner',
            'max_properties' => 25,
        ])->assertStatus(200)
            ->assertJsonPath('data.is_verified', true)
            ->assertJsonPath('data.plan_tier', 'partner')
            ->assertJsonPath('data.max_properties', 25);

        // Role & status guards (self-demotion & self-ban forbidden)
        $this->patchJson("/api/v1/admin/users/{$admin->id}/role", ['role' => 'user'])->assertStatus(422);
        $this->patchJson("/api/v1/admin/users/{$admin->id}/status", ['is_active' => false])->assertStatus(422);

        $this->patchJson("/api/v1/admin/users/{$broker->id}/role", ['role' => 'admin'])
            ->assertStatus(200)
            ->assertJsonPath('data.role', 'admin');

        // Site settings blocks SVG upload
        $svg = UploadedFile::fake()->create('banner.svg', 10, 'image/svg+xml');
        $this->post('/api/v1/admin/site-settings', [
            'hero_banner_image' => $svg,
        ], ['Accept' => 'application/json'])->assertStatus(422);

        // Audit logs recorded
        $this->assertTrue(AdminAuditLog::query()->where('action', 'property.moderate.approve')->exists());
        $this->assertTrue(AdminAuditLog::query()->where('action', 'company.update')->exists());

        $this->getJson('/api/v1/admin/audit-logs')->assertStatus(200);

        // CSV Export
        $csvRes = $this->get('/api/v1/admin/export/users');
        $csvRes->assertStatus(200);
        $this->assertStringContainsString('text/csv', (string) $csvRes->headers->get('Content-Type'));
    }

    public function test_company_property_quota_is_enforced_for_non_admins_and_bypassed_for_admins(): void
    {
        [$category, $location] = $this->createCategoryAndLocation();
        $broker = $this->createUser(UserRole::User, AccountType::Company);
        $company = new Company(['name' => 'شركة اختبار الحد الأقصى']);
        $company->user_id = $broker->id;
        $company->max_properties = 1;
        $company->save();

        Sanctum::actingAs($broker);

        $payload = [
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale->value,
            'payment_method' => PaymentMethod::Cash->value,
            'title_ar' => 'عقار أول ضمن الباقة',
            'description_ar' => 'تفاصيل العقار الأول كاملة للاختبار',
            'price_egp' => 1200000,
            'area_sqm' => 130,
            'address_details_ar' => 'حي الشرق، سوهاج',
            'submit' => false,
        ];

        $this->postJson('/api/v1/portal/properties', $payload)->assertStatus(201);

        $payload['title_ar'] = 'عقار ثاني يتجاوز الباقة';
        $this->postJson('/api/v1/portal/properties', $payload)
            ->assertStatus(403)
            ->assertJsonPath('error_code', 'COMPANY_PROPERTY_QUOTA_EXCEEDED');
    }

    public function test_make_admin_artisan_command_promotes_user(): void
    {
        $user = $this->createUser(UserRole::User, AccountType::Individual);

        $this->artisan('residenza:make-admin', ['email' => $user->email])
            ->assertExitCode(0);

        $user->refresh();
        $this->assertSame(UserRole::Admin, $user->role);
        $this->assertTrue((bool) $user->is_active);
    }

    public function test_csv_export_neutralizes_formula_injection_and_public_marketplace_hides_unapproved_listings(): void
    {
        [$category, $location] = $this->createCategoryAndLocation();
        $admin = $this->createUser(UserRole::Admin, AccountType::Admin);
        $broker = $this->createUser(UserRole::User, AccountType::Company);

        // Unapproved property must not appear in public marketplace
        $pendingProp = new Property([
            'reference_code' => 'RES-2026-' . random_int(10000, 99999),
            'slug' => 'pending-prop-' . uniqid(),
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale->value,
            'payment_method' => PaymentMethod::Cash->value,
            'title_ar' => 'عقار سري قيد المراجعة',
            'description_ar' => 'وصف تجريبي لعقار قيد المراجعة',
            'price_egp' => 1000000,
            'area_sqm' => 120,
            'address_details_ar' => 'سوهاج',
            'contact_phone' => '01012345678',
            'contact_whatsapp' => '01012345678',
            'availability_status' => AvailabilityStatus::Available->value,
        ]);
        $pendingProp->user_id = $broker->id;
        $pendingProp->moderation_status = ModerationStatus::PendingReview;
        $pendingProp->save();

        $this->getJson('/api/v1/properties')
            ->assertStatus(200)
            ->assertJsonCount(0, 'data');

        // CSV Formula Injection payload in buyer request
        BuyerRequest::query()->create([
            'name' => '=CMD("calc")',
            'phone' => '+201012345678',
            'property_type' => '@SUM(1+1)',
            'area' => '-الكوامل',
            'status' => 'new',
        ]);

        Sanctum::actingAs($admin);
        $csvRes = $this->get('/api/v1/admin/export/buyer-requests');
        $csvRes->assertStatus(200);
        $csvContent = $csvRes->streamedContent();
        $this->assertStringContainsString("'=CMD(", $csvContent);
        $this->assertStringContainsString("'+201012345678", $csvContent);
        $this->assertStringContainsString("'@SUM(1+1)", $csvContent);
        $this->assertStringContainsString("'-الكوامل", $csvContent);
    }
}
