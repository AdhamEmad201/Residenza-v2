<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AccountType;
use App\Enums\ModerationStatus;
use App\Enums\PaymentMethod;
use App\Enums\TransactionType;
use App\Models\User;
use App\Modules\Company\Models\Company;
use App\Modules\Company\Models\Project;
use App\Modules\Property\Models\Property;
use App\Modules\Taxonomy\Models\Category;
use App\Modules\Taxonomy\Models\Location;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AgencyStorefrontTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\SohagTaxonomySeeder::class);
    }

    public function test_authenticated_user_can_upsert_company_and_manage_projects_with_uploads(): void
    {
        Storage::fake('public');

        $agencyUser = User::factory()->company('شركة النيل للتطوير العقاري')->create();
        $otherUser = User::factory()->create();

        // Guest blocked
        $this->getJson('/api/v1/my-company')->assertStatus(401);

        Sanctum::actingAs($agencyUser);

        // Initially null
        $this->getJson('/api/v1/my-company')
            ->assertOk()
            ->assertJsonPath('data', null);

        // Create company with logo + cover upload and auto-generated slug
        $logo = UploadedFile::fake()->image('agency-logo.png', 400, 400);
        $cover = UploadedFile::fake()->image('agency-cover.jpg', 1200, 400);

        $upsertRes = $this->post('/api/v1/my-company', [
            'name' => 'Al Nile Developments',
            'bio' => 'شركة رائدة في التطوير العقاري بمدينة سوهاج الجديدة.',
            'address' => 'حي الكوثر - سوهاج',
            'phone' => '01012345678',
            'whatsapp' => '01012345678',
            'accent_color' => '#9F7753',
            'logo' => $logo,
            'cover' => $cover,
        ], ['Accept' => 'application/json']);

        $upsertRes->assertOk()
            ->assertJsonPath('data.name', 'Al Nile Developments')
            ->assertJsonPath('data.slug', 'al-nile-developments')
            ->assertJsonPath('data.accent_color', '#9F7753')
            ->assertJsonPath('data.is_verified', false);

        $logoPath = $upsertRes->json('data.logo_path');
        $coverPath = $upsertRes->json('data.cover_path');
        $this->assertStringStartsWith('companies/logos/', $logoPath);
        $this->assertStringStartsWith('companies/covers/', $coverPath);
        $this->assertNotNull($upsertRes->json('data.logo_url'));
        $this->assertNotNull($upsertRes->json('data.cover_url'));
        Storage::disk('public')->assertExists($logoPath);
        Storage::disk('public')->assertExists($coverPath);

        // Create project under my company
        $projectRes = $this->postJson('/api/v1/my-company/projects', [
            'name' => 'كمبوند ريزيدنزا الكوامل',
            'location' => 'مدينة سوهاج الجديدة',
            'description' => 'مشروع سكني متكامل الخدمات.',
        ]);

        $projectRes->assertStatus(201)
            ->assertJsonPath('data.name', 'كمبوند ريزيدنزا الكوامل');

        $projectId = (int) $projectRes->json('data.id');

        // Another user cannot delete this project
        Sanctum::actingAs($otherUser);
        $this->deleteJson("/api/v1/my-company/projects/{$projectId}")
            ->assertStatus(403);

        // Owner can delete project
        Sanctum::actingAs($agencyUser);
        $this->deleteJson("/api/v1/my-company/projects/{$projectId}")
            ->assertOk();
        $this->assertDatabaseMissing('projects', ['id' => $projectId]);
    }

    public function test_property_creation_auto_attaches_company_id_and_public_storefront_endpoints_work(): void
    {
        $agencyUser = User::factory()->create([
            'account_type' => AccountType::Company,
            'company_name' => 'شركة الصفوة العقارية',
        ]);
        $otherUser = User::factory()->create();
        $admin = User::factory()->admin()->create();

        $company = Company::unguarded(fn (): Company => Company::create([
            'user_id' => $agencyUser->id,
            'name' => 'Al Safwa Real Estate',
            'slug' => 'al-safwa-real-estate',
            'bio' => 'أفضل الوحدات السكنية والتجارية في سوهاج.',
            'is_verified' => true,
        ]));

        $project = Project::create([
            'company_id' => $company->id,
            'name' => 'برج الصفوة الإداري',
            'location' => 'حي الشرق - سوهاج',
        ]);

        $category = Category::where('slug', 'apartment')->firstOrFail();
        $location = Location::where('slug', 'hayy-sharq')->firstOrFail();

        Sanctum::actingAs($agencyUser);

        // Store property via portal -> auto-attaches company_id
        $storeRes = $this->postJson('/api/v1/portal/properties', [
            'project_id' => $project->id,
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale->value,
            'payment_method' => PaymentMethod::Cash->value,
            'title_ar' => 'شقة فاخرة ببرج الصفوة الإداري',
            'description_ar' => 'تفاصيل كاملة لشقة فاخرة في برج الصفوة بمدينة سوهاج.',
            'price_egp' => 2200000,
            'area_sqm' => 155,
            'address_details_ar' => 'حي الشرق - سوهاج',
        ]);

        $storeRes->assertStatus(201)
            ->assertJsonPath('data.company_id', $company->id)
            ->assertJsonPath('data.project_id', $project->id);

        $property = Property::findOrFail($storeRes->json('data.id'));
        $property->approve($admin);

        // Unrelated user's property must NOT appear in company storefront
        $otherProp = Property::submitNew([
            'slug' => 'other-user-prop',
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Cash,
            'title_ar' => 'شقة مملوكة لمستخدم آخر',
            'description_ar' => 'تفاصيل كاملة لشقة مملوكة لمستخدم آخر.',
            'price_egp' => 1100000,
            'area_sqm' => 100,
            'address_details_ar' => 'حي الشرق - سوهاج',
            'contact_phone' => '01012345678',
            'contact_whatsapp' => '01012345678',
        ], $otherUser);
        $otherProp->approve($admin);

        // Public /api/v1/companies lists company with property count = 1
        $listRes = $this->getJson('/api/v1/companies');
        $listRes->assertOk()
            ->assertJsonPath('data.0.slug', 'al-safwa-real-estate')
            ->assertJsonPath('data.0.properties_count', 1)
            ->assertJsonPath('data.0.is_verified', true);

        // Public /api/v1/companies/{slug} returns company + projects + only company properties
        $showRes = $this->getJson('/api/v1/companies/al-safwa-real-estate');
        $showRes->assertOk()
            ->assertJsonPath('data.company.slug', 'al-safwa-real-estate')
            ->assertJsonCount(1, 'data.company.projects')
            ->assertJsonCount(1, 'data.properties')
            ->assertJsonPath('data.properties.0.id', $property->id);

        // Public /api/v1/properties includes eager-loaded company badge
        $marketRes = $this->getJson('/api/v1/properties');
        $marketRes->assertOk();
        $matched = collect($marketRes->json('data'))->firstWhere('id', $property->id);
        $this->assertNotNull($matched);
        $this->assertSame('Al Safwa Real Estate', $matched['company']['name']);
        $this->assertTrue($matched['company']['is_verified']);

        // Cross-company project_id IDOR blocked (otherUser trying to use $project->id)
        Sanctum::actingAs($otherUser);
        $this->postJson('/api/v1/portal/properties', [
            'project_id' => $project->id,
            'category_id' => $category->id,
            'location_id' => $location->id,
            'transaction_type' => TransactionType::Sale->value,
            'payment_method' => PaymentMethod::Cash->value,
            'title_ar' => 'محاولة ربط غير مصرح بها',
            'description_ar' => 'وصف تفصيلي لمحاولة ربط عقار بمشروع شركة أخرى.',
            'price_egp' => 1500000,
            'area_sqm' => 120,
            'address_details_ar' => 'حي الشرق - سوهاج',
        ])->assertStatus(422)->assertJsonPath('error_code', 'INVALID_PROJECT_OWNERSHIP');
    }

    public function test_company_security_guards_block_is_verified_mass_assignment_reserved_slugs_and_svg_spoofing(): void
    {
        Storage::fake('public');

        $user = User::factory()->company('شركة اختبار الأمان')->create();
        Sanctum::actingAs($user);

        // 1. Reserved slug blocked
        $this->postJson('/api/v1/my-company', [
            'name' => 'Admin Agency',
            'slug' => 'admin',
        ])->assertStatus(422)->assertJsonValidationErrors(['slug']);

        // 2. Spoofed SVG disguised as .png blocked by finfo
        $spoofedSvg = UploadedFile::fake()->createWithContent(
            'evil.png',
            '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        );
        $this->post('/api/v1/my-company', [
            'name' => 'Safe Agency',
            'logo' => $spoofedSvg,
        ], ['Accept' => 'application/json'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['logo']);

        // 3. Attempting to inject is_verified=true via POST /api/v1/my-company is ignored
        $res = $this->postJson('/api/v1/my-company', [
            'name' => 'Safe Agency',
            'is_verified' => true,
        ]);
        $res->assertOk()->assertJsonPath('data.is_verified', false);
        $this->assertFalse((bool) $user->company()->firstOrFail()->is_verified);
    }
}
