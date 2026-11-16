<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AvailabilityStatus;
use App\Enums\FinishingType;
use App\Enums\ModerationStatus;
use App\Enums\PaymentMethod;
use App\Enums\PropertyType;
use App\Enums\TransactionType;
use App\Enums\UserStatus;
use App\Models\User;
use App\Modules\Media\Models\PropertyDocument;
use App\Modules\Media\Models\PropertyImage;
use App\Modules\Property\Models\Property;
use App\Modules\Taxonomy\Models\Category;
use App\Modules\Taxonomy\Models\Location;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class PublicTaxonomyAndMarketplaceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\SohagTaxonomySeeder::class);
    }

    public function test_public_categories_endpoint_returns_active_two_tier_tree_and_filters(): void
    {
        $inactive = Category::create([
            'parent_id' => null,
            'property_type' => PropertyType::Residential,
            'name_ar' => 'تصنيف معطل',
            'slug' => 'inactive-cat',
            'is_active' => false,
            'sort_order' => 99,
        ]);

        $res = $this->getJson('/api/v1/categories');
        $res->assertOk()
            ->assertJsonPath('success', true);

        $slugs = collect($res->json('data'))->pluck('slug')->all();
        $this->assertContains('apartment', $slugs);
        $this->assertNotContains($inactive->slug, $slugs);

        $filtered = $this->getJson('/api/v1/categories?property_type=commercial&flat=1');
        $filtered->assertOk();
        foreach ($filtered->json('data') as $cat) {
            $this->assertSame('commercial', $cat['property_type']);
        }
    }

    public function test_public_locations_endpoint_returns_active_sohag_tree_and_filters(): void
    {
        $res = $this->getJson('/api/v1/locations');
        $res->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.slug', 'sohag-governorate');

        $flat = $this->getJson('/api/v1/locations?type=city&flat=1');
        $flat->assertOk();
        $citySlugs = collect($flat->json('data'))->pluck('slug')->all();
        $this->assertContains('sohag-city', $citySlugs);
        $this->assertContains('new-sohag', $citySlugs);
    }

    public function test_public_marketplace_enforces_visibility_predicate_and_strips_private_fields(): void
    {
        $activeUser = User::factory()->create(['status' => UserStatus::Active]);
        $suspendedUser = User::factory()->suspended()->create();
        $category = Category::where('slug', 'apartment')->firstOrFail();
        $location = Location::where('slug', 'hayy-sharq')->firstOrFail();

        $visible = $this->createProperty($activeUser, $category, $location, [
            'title_ar' => 'شقة سوبر لوكس بحي الشرق',
            'moderation_status' => ModerationStatus::Approved,
            'availability_status' => AvailabilityStatus::Available,
            'published_at' => now()->subHour(),
            'rejection_reason' => 'Old note that must never leak',
        ]);

        PropertyImage::create([
            'property_id' => $visible->id,
            'disk' => 'public',
            'file_path' => 'properties/1/test.jpg',
            'mime_type' => 'image/jpeg',
            'file_size_bytes' => 102400,
            'is_primary' => true,
            'sort_order' => 0,
        ]);

        PropertyDocument::create([
            'property_id' => $visible->id,
            'uploaded_by' => $activeUser->id,
            'document_type' => 'ownership_proof',
            'disk' => 'private',
            'file_path' => 'property_documents/1/secret.pdf',
            'original_name' => 'secret-deed.pdf',
            'mime_type' => 'application/pdf',
            'file_size_bytes' => 204800,
        ]);

        // Non-visible listings: pending_review, sold, hidden, future published_at, soft-deleted, suspended owner
        $pending = $this->createProperty($activeUser, $category, $location, [
            'moderation_status' => ModerationStatus::PendingReview,
            'published_at' => null,
        ]);
        $sold = $this->createProperty($activeUser, $category, $location, [
            'moderation_status' => ModerationStatus::Approved,
            'availability_status' => AvailabilityStatus::Sold,
            'published_at' => now()->subHour(),
        ]);
        $hidden = $this->createProperty($activeUser, $category, $location, [
            'moderation_status' => ModerationStatus::Approved,
            'availability_status' => AvailabilityStatus::Hidden,
            'published_at' => now()->subHour(),
        ]);
        $future = $this->createProperty($activeUser, $category, $location, [
            'moderation_status' => ModerationStatus::Approved,
            'availability_status' => AvailabilityStatus::Available,
            'published_at' => now()->addDay(),
        ]);
        $deleted = $this->createProperty($activeUser, $category, $location, [
            'moderation_status' => ModerationStatus::Approved,
            'availability_status' => AvailabilityStatus::Available,
            'published_at' => now()->subHour(),
        ]);
        $deleted->delete();
        $suspendedProp = $this->createProperty($suspendedUser, $category, $location, [
            'moderation_status' => ModerationStatus::Approved,
            'availability_status' => AvailabilityStatus::Available,
            'published_at' => now()->subHour(),
        ]);

        $indexRes = $this->getJson('/api/v1/properties');
        $indexRes->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $visible->id);

        $item = $indexRes->json('data.0');
        $this->assertArrayNotHasKey('user_id', $item);
        $this->assertArrayNotHasKey('reviewed_by', $item);
        $this->assertArrayNotHasKey('reviewed_at', $item);
        $this->assertArrayNotHasKey('rejection_reason', $item);
        $this->assertArrayNotHasKey('moderation_status', $item);
        $this->assertArrayNotHasKey('moderation_logs', $item);
        $this->assertArrayNotHasKey('documents', $item);
        $this->assertArrayHasKey('owner_display', $item);

        // Show endpoint returns 200 for visible, 404 for hidden/pending/suspended
        $this->getJson("/api/v1/properties/{$visible->slug}")
            ->assertOk()
            ->assertJsonPath('data.slug', $visible->slug);

        foreach ([$pending, $sold, $hidden, $future, $deleted, $suspendedProp] as $nonVisible) {
            $this->getJson("/api/v1/properties/{$nonVisible->slug}")
                ->assertStatus(404);
        }
    }

    public function test_public_marketplace_supports_hierarchy_filters_search_and_sorting(): void
    {
        $owner = User::factory()->create(['status' => UserStatus::Active]);
        $aptCategory = Category::where('slug', 'apartment')->firstOrFail();
        $shopCategory = Category::where('slug', 'commercial-shop')->firstOrFail();

        $sohagCity = Location::where('slug', 'sohag-city')->firstOrFail();
        $hayySharq = Location::where('slug', 'hayy-sharq')->firstOrFail();
        $newSohag = Location::where('slug', 'new-sohag')->firstOrFail();

        $p1 = $this->createProperty($owner, $aptCategory, $hayySharq, [
            'title_ar' => 'شقة فاخرة بالجمهورية',
            'price_egp' => 1500000,
            'area_sqm' => 140,
            'bedrooms' => 3,
            'finishing_type' => FinishingType::SuperLux,
            'moderation_status' => ModerationStatus::Approved,
            'availability_status' => AvailabilityStatus::Available,
            'published_at' => now()->subHours(2),
        ]);

        $p2 = $this->createProperty($owner, $shopCategory, $newSohag, [
            'title_ar' => 'محل تجاري بسوهاج الجديدة',
            'price_egp' => 3000000,
            'area_sqm' => 80,
            'bedrooms' => null,
            'finishing_type' => FinishingType::CoreAndShell,
            'moderation_status' => ModerationStatus::Approved,
            'availability_status' => AvailabilityStatus::Available,
            'published_at' => now()->subHour(),
        ]);

        // Descendant expansion: filtering by sohag-city includes hayy-sharq
        $locRes = $this->getJson("/api/v1/properties?location_id={$sohagCity->id}");
        $locRes->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $p1->id);

        // Search & property_type filter
        $qRes = $this->getJson('/api/v1/properties?property_type=commercial&q=تجاري');
        $qRes->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $p2->id);

        // Sorting
        $sortAsc = $this->getJson('/api/v1/properties?sort=price_asc');
        $sortAsc->assertOk();
        $this->assertSame([$p1->id, $p2->id], collect($sortAsc->json('data'))->pluck('id')->all());

        $sortDesc = $this->getJson('/api/v1/properties?sort=price_desc');
        $sortDesc->assertOk();
        $this->assertSame([$p2->id, $p1->id], collect($sortDesc->json('data'))->pluck('id')->all());
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function createProperty(User $owner, Category $category, Location $location, array $overrides = []): Property
    {
        return Property::unguarded(fn (): Property => Property::create(array_merge([
            'reference_code' => 'RES-2026-' . str_pad((string) random_int(1, 99999), 5, '0', STR_PAD_LEFT),
            'slug' => 'prop-' . Str::lower(Str::random(10)),
            'user_id' => $owner->id,
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Cash,
            'rental_period' => null,
            'title_ar' => 'عقار تجريبي بسوهاج',
            'description_ar' => 'وصف تفصيلي للعقار التجريبي في محافظة سوهاج',
            'price_egp' => 1200000.00,
            'installment_price_egp' => null,
            'down_payment_egp' => null,
            'installment_period_months' => null,
            'insurance_deposit_egp' => null,
            'area_sqm' => 120.00,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'address_details_ar' => 'شارع 15 - سوهاج',
            'contact_phone' => '01012345678',
            'contact_whatsapp' => '01012345678',
            'moderation_status' => ModerationStatus::PendingReview,
            'availability_status' => AvailabilityStatus::Available,
        ], $overrides)));
    }
}
