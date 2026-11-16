<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\LocationType;
use App\Enums\PropertyType;
use App\Enums\UserStatus;
use App\Models\User;
use App\Modules\Taxonomy\Models\Category;
use App\Modules\Taxonomy\Models\Location;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminUserAndTaxonomyManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\SohagTaxonomySeeder::class);
    }

    public function test_admin_user_listing_and_self_suspension_guard(): void
    {
        $admin = User::factory()->admin()->create();
        $targetUser = User::factory()->create(['name' => 'أحمد سوهاج']);

        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/users?q=أحمد')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $targetUser->id);

        // Self-suspension blocked with 422
        $this->patchJson("/api/v1/admin/users/{$admin->id}/status", [
            'status' => UserStatus::Suspended->value,
        ])->assertStatus(422)
            ->assertJsonPath('error_code', 'SELF_SUSPENSION_FORBIDDEN');

        // Suspend & reactivate another user
        $this->patchJson("/api/v1/admin/users/{$targetUser->id}/status", [
            'status' => UserStatus::Suspended->value,
        ])->assertOk()
            ->assertJsonPath('data.status', 'suspended');

        $this->patchJson("/api/v1/admin/users/{$targetUser->id}/status", [
            'status' => UserStatus::Active->value,
        ])->assertOk()
            ->assertJsonPath('data.status', 'active');
    }

    public function test_admin_category_crud_enforces_hierarchy_and_restrict_on_delete(): void
    {
        $admin = User::factory()->admin()->create();
        $aptRoot = Category::where('slug', 'apartment')->firstOrFail();

        Sanctum::actingAs($admin);

        // Create child category matching parent property_type
        $childRes = $this->postJson('/api/v1/admin/categories', [
            'parent_id' => $aptRoot->id,
            'property_type' => PropertyType::Residential->value,
            'name_ar' => 'شقة دوبلكس',
            'slug' => 'duplex-apartment',
        ]);
        $childRes->assertStatus(201);
        $childId = $childRes->json('data.id');

        // Reject 3rd-tier category (child under child)
        $this->postJson('/api/v1/admin/categories', [
            'parent_id' => $childId,
            'property_type' => PropertyType::Residential->value,
            'name_ar' => 'دوبلكس فرعي',
            'slug' => 'sub-duplex',
        ])->assertStatus(422)->assertJsonPath('error_code', 'HIERARCHY_VIOLATION');

        // Reject deleting parent that has children
        $this->deleteJson("/api/v1/admin/categories/{$aptRoot->id}")
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'RESOURCE_IN_USE');

        // Deleting unused child succeeds
        $this->deleteJson("/api/v1/admin/categories/{$childId}")->assertOk();
    }

    public function test_admin_location_crud_enforces_parent_matrix_partial_slugs_and_restrict_on_delete(): void
    {
        $admin = User::factory()->admin()->create();
        $sohagGov = Location::where('slug', 'sohag-governorate')->firstOrFail();
        $sohagCity = Location::where('slug', 'sohag-city')->firstOrFail();
        $newSohag = Location::where('slug', 'new-sohag')->firstOrFail();

        Sanctum::actingAs($admin);

        // Reject village directly under governorate (must be under markaz)
        $this->postJson('/api/v1/admin/locations', [
            'parent_id' => $sohagGov->id,
            'type' => LocationType::Village->value,
            'name_ar' => 'قرية غير صالحة',
            'slug' => 'invalid-village',
        ])->assertStatus(422)->assertJsonPath('error_code', 'HIERARCHY_VIOLATION');

        // Allow same slug under distinct parents
        $d1 = $this->postJson('/api/v1/admin/locations', [
            'parent_id' => $sohagCity->id,
            'type' => LocationType::District->value,
            'name_ar' => 'الحي المتميز',
            'slug' => 'distinct-district',
        ])->assertStatus(201);

        $this->postJson('/api/v1/admin/locations', [
            'parent_id' => $newSohag->id,
            'type' => LocationType::District->value,
            'name_ar' => 'الحي المتميز',
            'slug' => 'distinct-district',
        ])->assertStatus(201);

        // Reject duplicate slug under same parent
        $this->postJson('/api/v1/admin/locations', [
            'parent_id' => $sohagCity->id,
            'type' => LocationType::District->value,
            'name_ar' => 'الحي المكرر',
            'slug' => 'distinct-district',
        ])->assertStatus(422)->assertJsonValidationErrors(['slug']);

        // Reject deleting parent with children
        $this->deleteJson("/api/v1/admin/locations/{$sohagCity->id}")
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'RESOURCE_IN_USE');

        // Delete newly created leaf district
        $this->deleteJson("/api/v1/admin/locations/{$d1->json('data.id')}")->assertOk();
    }
}
