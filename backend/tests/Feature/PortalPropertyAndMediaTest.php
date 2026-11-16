<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AvailabilityStatus;
use App\Enums\DocumentType;
use App\Enums\ModerationStatus;
use App\Enums\PaymentMethod;
use App\Enums\TransactionType;
use App\Models\User;
use App\Modules\Media\Models\PropertyDocument;
use App\Modules\Media\Models\PropertyImage;
use App\Modules\Property\Models\Property;
use App\Modules\Taxonomy\Models\Category;
use App\Modules\Taxonomy\Models\Location;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PortalPropertyAndMediaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\SohagTaxonomySeeder::class);
    }

    public function test_unauthenticated_and_suspended_users_cannot_access_portal_properties(): void
    {
        $this->getJson('/api/v1/portal/properties')->assertStatus(401);

        $suspended = User::factory()->suspended()->create();
        Sanctum::actingAs($suspended);
        $this->getJson('/api/v1/portal/properties')->assertStatus(403);
    }

    public function test_owner_can_create_draft_submit_and_enforce_ud02_b_and_od05_validation(): void
    {
        $owner = User::factory()->create();
        $category = Category::where('slug', 'apartment')->firstOrFail();
        $location = Location::where('slug', 'hayy-sharq')->firstOrFail();

        Sanctum::actingAs($owner);

        // UD-02 = B: cash_or_installment without installment_price_egp fails 422
        $this->postJson('/api/v1/portal/properties', [
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale->value,
            'payment_method' => PaymentMethod::CashOrInstallment->value,
            'title_ar' => 'شقة للبيع كاش أو تقسيط',
            'description_ar' => 'شقة مميزة للبيع كاش أو بالتقسيط في سوهاج',
            'price_egp' => 2000000,
            'area_sqm' => 150,
            'address_details_ar' => 'حي الشرق - سوهاج',
        ])->assertStatus(422)->assertJsonValidationErrors(['installment_price_egp']);

        // OD-05 + UD-02 = B: down_payment_egp >= installment_price_egp fails 422
        $this->postJson('/api/v1/portal/properties', [
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale->value,
            'payment_method' => PaymentMethod::CashOrInstallment->value,
            'title_ar' => 'شقة للبيع كاش أو تقسيط',
            'description_ar' => 'شقة مميزة للبيع كاش أو بالتقسيط في سوهاج',
            'price_egp' => 2000000,
            'installment_price_egp' => 2400000,
            'down_payment_egp' => 2400000,
            'installment_period_months' => 48,
            'area_sqm' => 150,
            'address_details_ar' => 'حي الشرق - سوهاج',
        ])->assertStatus(422)->assertJsonValidationErrors(['down_payment_egp']);

        // Valid cash_or_installment draft where down_payment_egp > cash price_egp but < installment_price_egp
        $draftRes = $this->postJson('/api/v1/portal/properties', [
            'submit' => false,
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale->value,
            'payment_method' => PaymentMethod::CashOrInstallment->value,
            'title_ar' => 'شقة للبيع كاش أو تقسيط',
            'description_ar' => 'شقة مميزة للبيع كاش أو بالتقسيط في سوهاج',
            'price_egp' => 2000000,
            'installment_price_egp' => 2500000,
            'down_payment_egp' => 2100000,
            'installment_period_months' => 48,
            'area_sqm' => 150,
            'address_details_ar' => 'حي الشرق - سوهاج',
        ]);

        $draftRes->assertStatus(201)
            ->assertJsonPath('data.moderation_status', 'draft')
            ->assertJsonPath('data.installment_price_egp', '2500000.00');

        $propertyId = $draftRes->json('data.id');

        // Submit draft -> pending_review
        $this->postJson("/api/v1/portal/properties/{$propertyId}/submit")
            ->assertOk()
            ->assertJsonPath('data.moderation_status', 'pending_review');

        // Submitting again -> 422 INVALID_STATE_TRANSITION
        $this->postJson("/api/v1/portal/properties/{$propertyId}/submit")
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'INVALID_STATE_TRANSITION');
    }

    public function test_ownership_isolation_blocks_other_users(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $category = Category::where('slug', 'apartment')->firstOrFail();
        $location = Location::where('slug', 'hayy-sharq')->firstOrFail();

        $property = Property::submitNew([
            'slug' => 'owner-prop-1',
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Cash,
            'title_ar' => 'شقة مملوكة لمستخدم',
            'description_ar' => 'تفاصيل شقة مملوكة لمستخدم في سوهاج',
            'price_egp' => 1000000,
            'area_sqm' => 100,
            'address_details_ar' => 'حي الشرق - سوهاج',
            'contact_phone' => '01012345678',
            'contact_whatsapp' => '01012345678',
        ], $owner);

        Sanctum::actingAs($other);

        $this->getJson("/api/v1/portal/properties/{$property->id}")->assertStatus(403);
        $this->patchJson("/api/v1/portal/properties/{$property->id}", ['title_ar' => 'تعديل غير مصرح'])->assertStatus(403);
        $this->patchJson("/api/v1/portal/properties/{$property->id}/availability", ['availability_status' => 'hidden'])->assertStatus(403);
        $this->deleteJson("/api/v1/portal/properties/{$property->id}")->assertStatus(403);
    }

    public function test_material_edit_resets_approved_listing_while_availability_toggle_preserves_approval(): void
    {
        $owner = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $category = Category::where('slug', 'apartment')->firstOrFail();
        $location = Location::where('slug', 'hayy-sharq')->firstOrFail();

        $property = Property::submitNew([
            'slug' => 'approved-prop-1',
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Cash,
            'title_ar' => 'شقة معتمدة للبيع',
            'description_ar' => 'وصف تفصيلي لشقة معتمدة للبيع في سوهاج',
            'price_egp' => 1500000,
            'area_sqm' => 130,
            'address_details_ar' => 'حي الشرق - سوهاج',
            'contact_phone' => '01012345678',
            'contact_whatsapp' => '01012345678',
        ], $owner);
        $property->approve($admin);

        Sanctum::actingAs($owner);

        // Availability toggle (UD-01 = A: hidden) preserves approved status
        $this->patchJson("/api/v1/portal/properties/{$property->id}/availability", [
            'availability_status' => AvailabilityStatus::Hidden->value,
        ])->assertOk()
            ->assertJsonPath('data.availability_status', 'hidden')
            ->assertJsonPath('data.moderation_status', 'approved');

        $this->assertNotNull($property->fresh()->published_at);

        // Material content edit resets approved -> pending_review
        $this->patchJson("/api/v1/portal/properties/{$property->id}", [
            'title_ar' => 'شقة معتمدة بعد تعديل العنوان',
        ])->assertOk()
            ->assertJsonPath('data.moderation_status', 'pending_review')
            ->assertJsonPath('data.published_at', null);

        $this->assertDatabaseHas('moderation_logs', [
            'property_id' => $property->id,
            'action' => 'edit_reset',
            'from_status' => 'approved',
            'to_status' => 'pending_review',
        ]);
    }

    public function test_dual_disk_media_upload_uuid_naming_and_edit_reset_rules(): void
    {
        Storage::fake('public');
        Storage::fake('private');

        $owner = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $category = Category::where('slug', 'apartment')->firstOrFail();
        $location = Location::where('slug', 'hayy-sharq')->firstOrFail();

        $property = Property::submitNew([
            'slug' => 'media-prop-1',
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Cash,
            'title_ar' => 'شقة لاختبار الملفات',
            'description_ar' => 'وصف تفصيلي لشقة اختبار الملفات في سوهاج',
            'price_egp' => 1500000,
            'area_sqm' => 130,
            'address_details_ar' => 'حي الشرق - سوهاج',
            'contact_phone' => '01012345678',
            'contact_whatsapp' => '01012345678',
        ], $owner);
        $property->approve($admin);

        Sanctum::actingAs($owner);

        // 1. Spoofed PDF (plain text disguised as .pdf) is rejected by finfo
        $spoofedPdf = UploadedFile::fake()->createWithContent('spoofed.pdf', 'This is not a real PDF');
        $this->postJson("/api/v1/portal/properties/{$property->id}/documents", [
            'document_type' => DocumentType::OwnershipProof->value,
            'document' => $spoofedPdf,
        ])->assertStatus(422)->assertJsonValidationErrors(['document']);

        // 2. Upload real PDF private document -> does NOT reset approved status
        $pdf = UploadedFile::fake()->createWithContent(
            'my-secret-deed.pdf',
            "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"
        );
        $docRes = $this->postJson("/api/v1/portal/properties/{$property->id}/documents", [
            'document_type' => DocumentType::OwnershipProof->value,
            'document' => $pdf,
        ]);

        $docRes->assertStatus(201)
            ->assertJsonPath('data.disk', 'private')
            ->assertJsonPath('data.original_name', 'my-secret-deed.pdf');

        $docPath = $docRes->json('data.file_path');
        $this->assertStringStartsWith("property_documents/{$property->id}/", $docPath);
        $this->assertStringNotContainsString('my-secret-deed', $docPath);
        Storage::disk('private')->assertExists($docPath);
        $this->assertSame(ModerationStatus::Approved, $property->fresh()->moderation_status);

        // 2. Upload public images -> stores UUID v4 on public disk AND resets approved -> pending_review
        $img1 = UploadedFile::fake()->image('front.jpg', 800, 600);
        $img2 = UploadedFile::fake()->image('room.png', 800, 600);

        $imgRes = $this->postJson("/api/v1/portal/properties/{$property->id}/images", [
            'images' => [$img1, $img2],
        ]);

        $imgRes->assertStatus(201)
            ->assertJsonPath('data.moderation_status', 'pending_review')
            ->assertJsonCount(2, 'data.images');

        $img1Data = $imgRes->json('data.images.0');
        $img2Data = $imgRes->json('data.images.1');
        $this->assertTrue($img1Data['is_primary']);
        $this->assertFalse($img2Data['is_primary']);
        Storage::disk('public')->assertExists($img1Data['file_path']);
        Storage::disk('public')->assertExists($img2Data['file_path']);

        // 3. Re-approve and toggle primary image -> does NOT reset approved status
        $property->refresh()->approve($admin);
        $this->patchJson("/api/v1/portal/properties/{$property->id}/images/{$img2Data['id']}/primary")
            ->assertOk()
            ->assertJsonPath('data.is_primary', true);
        $this->assertSame(ModerationStatus::Approved, $property->fresh()->moderation_status);

        // 4. Delete image -> deletes from disk AND resets approved -> pending_review
        $this->deleteJson("/api/v1/portal/properties/{$property->id}/images/{$img1Data['id']}")
            ->assertOk()
            ->assertJsonPath('data.moderation_status', 'pending_review');
        Storage::disk('public')->assertMissing($img1Data['file_path']);

        // 5. Delete document -> removes from private disk
        $docId = $docRes->json('data.id');
        $this->deleteJson("/api/v1/portal/properties/{$property->id}/documents/{$docId}")->assertOk();
        Storage::disk('private')->assertMissing($docPath);

        // 6. Enforce max 15 images & max 5 documents
        for ($i = 0; $i < 14; $i++) {
            PropertyImage::create([
                'property_id' => $property->id,
                'disk' => 'public',
                'file_path' => "properties/{$property->id}/extra-{$i}.jpg",
                'mime_type' => 'image/jpeg',
                'file_size_bytes' => 1024,
                'is_primary' => false,
                'sort_order' => $i + 10,
            ]);
        }
        $this->postJson("/api/v1/portal/properties/{$property->id}/images", [
            'images' => [UploadedFile::fake()->image('overflow.jpg', 600, 600)],
        ])->assertStatus(422)->assertJsonValidationErrors(['images']);

        for ($i = 0; $i < 5; $i++) {
            PropertyDocument::create([
                'property_id' => $property->id,
                'uploaded_by' => $owner->id,
                'document_type' => DocumentType::Other->value,
                'disk' => 'private',
                'file_path' => "property_documents/{$property->id}/extra-{$i}.pdf",
                'original_name' => "extra-{$i}.pdf",
                'mime_type' => 'application/pdf',
                'file_size_bytes' => 1024,
            ]);
        }
        $this->postJson("/api/v1/portal/properties/{$property->id}/documents", [
            'document_type' => DocumentType::Other->value,
            'document' => UploadedFile::fake()->createWithContent('overflow.pdf', "%PDF-1.4\n%%EOF\n"),
        ])->assertStatus(422)->assertJsonValidationErrors(['document']);
    }
}
