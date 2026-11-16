<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AvailabilityStatus;
use App\Enums\ModerationStatus;
use App\Enums\PaymentMethod;
use App\Enums\TransactionType;
use App\Models\User;
use App\Modules\Property\Models\Property;
use App\Modules\Taxonomy\Models\Category;
use App\Modules\Taxonomy\Models\Location;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminModerationAndDirectPublishTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\SohagTaxonomySeeder::class);
    }

    public function test_non_admin_and_guests_are_blocked_from_admin_endpoints(): void
    {
        $this->getJson('/api/v1/admin/dashboard')->assertStatus(401);

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/admin/dashboard')->assertStatus(403);
        $this->getJson('/api/v1/admin/properties')->assertStatus(403);
    }

    public function test_admin_direct_publish_od01_and_ud02_b_and_dashboard_stats(): void
    {
        $admin = User::factory()->admin()->create();
        $category = Category::where('slug', 'apartment')->firstOrFail();
        $location = Location::where('slug', 'hayy-sharq')->firstOrFail();

        Sanctum::actingAs($admin);

        $res = $this->postJson('/api/v1/admin/properties', [
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale->value,
            'payment_method' => PaymentMethod::CashOrInstallment->value,
            'title_ar' => 'عقار رسمي مباشر من الإدارة',
            'description_ar' => 'وصف تفصيلي لعقار منشور مباشرة بواسطة الإدارة في سوهاج',
            'price_egp' => 3000000,
            'installment_price_egp' => 3500000,
            'down_payment_egp' => 500000,
            'installment_period_months' => 60,
            'area_sqm' => 180,
            'address_details_ar' => 'حي الشرق - سوهاج',
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('data.moderation_status', 'approved')
            ->assertJsonPath('data.reviewed_by', $admin->id)
            ->assertJsonPath('data.installment_price_egp', '3500000.00');

        $propertyId = $res->json('data.id');
        $this->assertNotNull($res->json('data.published_at'));

        $this->assertDatabaseHas('moderation_logs', [
            'property_id' => $propertyId,
            'actor_id' => $admin->id,
            'from_status' => null,
            'to_status' => 'approved',
            'action' => 'admin_direct_publish',
        ]);

        $dash = $this->getJson('/api/v1/admin/dashboard');
        $dash->assertOk()
            ->assertJsonPath('data.properties.total', 1)
            ->assertJsonPath('data.properties.by_moderation_status.approved', 1);
    }

    public function test_self_approval_guard_and_full_moderation_transitions(): void
    {
        $admin1 = User::factory()->admin()->create();
        $admin2 = User::factory()->admin()->create();
        $owner = User::factory()->create();
        $category = Category::where('slug', 'apartment')->firstOrFail();
        $location = Location::where('slug', 'hayy-sharq')->firstOrFail();

        // Admin1's own user-submitted listing cannot be approved by Admin1
        $adminOwnedProp = Property::submitNew([
            'slug' => 'admin1-owned-prop',
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Cash,
            'title_ar' => 'عقار مملوك للمدير الأول',
            'description_ar' => 'تفاصيل عقار مملوك للمدير الأول للمراجعة',
            'price_egp' => 1500000,
            'area_sqm' => 120,
            'address_details_ar' => 'حي الشرق - سوهاج',
            'contact_phone' => '01012345678',
            'contact_whatsapp' => '01012345678',
        ], $admin1);

        Sanctum::actingAs($admin1);
        $this->postJson("/api/v1/admin/properties/{$adminOwnedProp->id}/approve")
            ->assertStatus(403);

        // Admin2 can approve Admin1's listing
        Sanctum::actingAs($admin2);
        $this->postJson("/api/v1/admin/properties/{$adminOwnedProp->id}/approve", [
            'notes' => 'تمت المراجعة والموافقة من مدير آخر',
        ])->assertOk()
            ->assertJsonPath('data.moderation_status', 'approved')
            ->assertJsonPath('data.reviewed_by', $admin2->id);

        // Owner listing: request_changes requires reason, then resubmit, then reject
        $ownerProp = Property::submitNew([
            'slug' => 'owner-mod-prop',
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Cash,
            'title_ar' => 'شقة للمراجعة الإدارية',
            'description_ar' => 'تفاصيل شقة للمراجعة الإدارية في سوهاج',
            'price_egp' => 1200000,
            'area_sqm' => 110,
            'address_details_ar' => 'حي الشرق - سوهاج',
            'contact_phone' => '01012345678',
            'contact_whatsapp' => '01012345678',
        ], $owner);

        $this->postJson("/api/v1/admin/properties/{$ownerProp->id}/request-changes", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);

        $this->postJson("/api/v1/admin/properties/{$ownerProp->id}/request-changes", [
            'reason' => 'يرجى توضيح رقم الطابق وإضافة صور واضحة',
        ])->assertOk()
            ->assertJsonPath('data.moderation_status', 'changes_requested')
            ->assertJsonPath('data.rejection_reason', 'يرجى توضيح رقم الطابق وإضافة صور واضحة');

        // Reject from changes_requested
        $this->postJson("/api/v1/admin/properties/{$ownerProp->id}/reject", [
            'reason' => 'بيانات الملكية غير مطابقة لشروط المنصة',
        ])->assertOk()
            ->assertJsonPath('data.moderation_status', 'rejected');

        // Admin feature/availability toggle & soft-delete
        $this->patchJson("/api/v1/admin/properties/{$adminOwnedProp->id}", [
            'is_featured' => true,
            'availability_status' => AvailabilityStatus::Hidden->value,
        ])->assertOk()
            ->assertJsonPath('data.is_featured', true)
            ->assertJsonPath('data.availability_status', 'hidden')
            ->assertJsonPath('data.moderation_status', 'approved');

        $this->deleteJson("/api/v1/admin/properties/{$adminOwnedProp->id}")->assertOk();
        $this->getJson('/api/v1/admin/properties?trashed=only')
            ->assertOk()
            ->assertJsonPath('meta.total', 1);
    }
}
