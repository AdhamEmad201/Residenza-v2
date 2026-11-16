<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\DocumentType;
use App\Enums\PaymentMethod;
use App\Enums\TransactionType;
use App\Models\User;
use App\Modules\Media\Models\PropertyDocument;
use App\Modules\Property\Models\Property;
use App\Modules\Taxonomy\Models\Category;
use App\Modules\Taxonomy\Models\Location;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PrivateDocumentDownloadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\SohagTaxonomySeeder::class);
    }

    public function test_private_document_streaming_enforces_owner_or_admin_policy_and_security_headers(): void
    {
        Storage::fake('private');

        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $suspendedOwner = User::factory()->suspended()->create();
        $admin = User::factory()->admin()->create();
        $category = Category::where('slug', 'apartment')->firstOrFail();
        $location = Location::where('slug', 'hayy-sharq')->firstOrFail();

        $property = Property::submitNew([
            'slug' => 'doc-stream-prop',
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Cash,
            'title_ar' => 'عقار بمستند تحقق خاص',
            'description_ar' => 'تفاصيل عقار يحتوي على مستند تحقق خاص',
            'price_egp' => 1500000,
            'area_sqm' => 130,
            'address_details_ar' => 'حي الشرق - سوهاج',
            'contact_phone' => '01012345678',
            'contact_whatsapp' => '01012345678',
        ], $owner);

        $filePath = "property_documents/{$property->id}/deed-uuid.pdf";
        Storage::disk('private')->put($filePath, "%PDF-1.4\n%%EOF\n");

        $document = PropertyDocument::create([
            'property_id' => $property->id,
            'uploaded_by' => $owner->id,
            'document_type' => DocumentType::OwnershipProof->value,
            'disk' => 'private',
            'file_path' => $filePath,
            'original_name' => 'ownership_deed.pdf',
            'mime_type' => 'application/pdf',
            'file_size_bytes' => 16,
        ]);

        // Guest -> 401
        $this->getJson("/api/v1/documents/{$document->id}/download")->assertStatus(401);

        // Other user -> 403
        Sanctum::actingAs($otherUser);
        $this->getJson("/api/v1/documents/{$document->id}/download")->assertStatus(403);

        // Suspended user -> 403
        Sanctum::actingAs($suspendedOwner);
        $this->getJson("/api/v1/documents/{$document->id}/download")->assertStatus(403);

        // Owner -> 200 with security headers
        Sanctum::actingAs($owner);
        $ownerRes = $this->get("/api/v1/documents/{$document->id}/download");
        $ownerRes->assertOk();
        $this->assertSame('nosniff', $ownerRes->headers->get('X-Content-Type-Options'));
        $this->assertStringContainsString('no-store', (string) $ownerRes->headers->get('Cache-Control'));
        $this->assertStringContainsString('inline;', (string) $ownerRes->headers->get('Content-Disposition'));
        $this->assertSame('application/pdf', $ownerRes->headers->get('Content-Type'));

        // Active Admin -> 200
        Sanctum::actingAs($admin);
        $this->get("/api/v1/documents/{$document->id}/download")->assertOk();

        // Missing file on private disk -> 404
        Storage::disk('private')->delete($filePath);
        $this->getJson("/api/v1/documents/{$document->id}/download")->assertStatus(404);
    }
}
