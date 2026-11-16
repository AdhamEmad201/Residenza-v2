<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AvailabilityStatus;
use App\Enums\FacadeType;
use App\Enums\FinishingType;
use App\Enums\LegalStatus;
use App\Enums\ModerationStatus;
use App\Enums\PaymentMethod;
use App\Enums\RentalPeriod;
use App\Enums\TransactionType;
use App\Models\User;
use App\Modules\Property\Models\Property;
use App\Modules\Property\Services\ReferenceCodeGenerator;
use App\Modules\Taxonomy\Models\Category;
use App\Modules\Taxonomy\Models\Location;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Property>
 */
class PropertyFactory extends Factory
{
    protected $model = Property::class;

    public function definition(): array
    {
        $year = Carbon::now('Africa/Cairo')->year;
        $uniqueNum = $this->faker->unique()->numberBetween(10000, 99999);
        $refCode = sprintf('RES-%04d-%05d', $year, $uniqueNum);
        $title = 'شقة فاخرة ' . $this->faker->words(2, true);

        return [
            'reference_code' => $refCode,
            'slug' => Str::slug($title) . '-' . strtolower($refCode),
            'user_id' => User::factory(),
            'category_id' => Category::first()?->id ?? 1,
            'location_id' => Location::whereNotNull('parent_id')->first()?->id ?? 1,
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Cash,
            'rental_period' => null,
            'down_payment_egp' => null,
            'installment_period_months' => null,
            'insurance_deposit_egp' => null,
            'title_ar' => $title,
            'description_ar' => 'وصف تفصيلي للعقار مع كافة الخدمات والمرافق الأساسية.',
            'price_egp' => 1850000.00,
            'area_sqm' => 145.50,
            'bedrooms' => 3,
            'bathrooms' => 2,
            'floor_level' => 3,
            'total_floors' => 8,
            'finishing_type' => FinishingType::SuperLux,
            'building_year' => 2021,
            'street_width_meters' => 16.00,
            'facade_type' => FacadeType::Northern,
            'declared_legal_status' => LegalStatus::RegisteredShahrAqari,
            'has_elevator' => true,
            'has_electricity_meter' => true,
            'has_water_meter' => true,
            'has_natural_gas' => true,
            'address_details_ar' => 'ش الجمهورية، سوهاج، بجوار المستشفى',
            'contact_phone' => '+201012345678',
            'contact_whatsapp' => '+201012345678',
            'moderation_status' => ModerationStatus::PendingReview,
            'availability_status' => AvailabilityStatus::Available,
            'rejection_reason' => null,
            'reviewed_by' => null,
            'reviewed_at' => null,
            'published_at' => null,
            'is_featured' => false,
        ];
    }

    public function saleCash(): static
    {
        return $this->state(fn (array $attributes) => [
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Cash,
            'rental_period' => null,
            'down_payment_egp' => null,
            'installment_period_months' => null,
            'insurance_deposit_egp' => null,
        ]);
    }

    public function saleInstallment(?float $downPayment = 350000.00, int $months = 60): static
    {
        return $this->state(fn (array $attributes) => [
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::Installment,
            'rental_period' => null,
            'down_payment_egp' => $downPayment,
            'installment_period_months' => $months,
            'insurance_deposit_egp' => null,
        ]);
    }

    public function saleCashOrInstallment(?float $downPayment = null, ?int $months = null): static
    {
        return $this->state(fn (array $attributes) => [
            'transaction_type' => TransactionType::Sale,
            'payment_method' => PaymentMethod::CashOrInstallment,
            'rental_period' => null,
            'down_payment_egp' => $downPayment,
            'installment_period_months' => $months,
            'insurance_deposit_egp' => null,
        ]);
    }

    public function forRent(RentalPeriod $period = RentalPeriod::Monthly, ?float $deposit = 10000.00): static
    {
        return $this->state(fn (array $attributes) => [
            'transaction_type' => TransactionType::Rent,
            'payment_method' => null,
            'rental_period' => $period,
            'down_payment_egp' => null,
            'installment_period_months' => null,
            'insurance_deposit_egp' => $deposit,
            'price_egp' => 6500.00,
        ]);
    }

    public function draft(): static
    {
        return $this->state(fn (array $attributes) => [
            'moderation_status' => ModerationStatus::Draft,
            'published_at' => null,
            'reviewed_by' => null,
            'reviewed_at' => null,
        ]);
    }

    public function approved(?Carbon $publishedAt = null): static
    {
        return $this->state(fn (array $attributes) => [
            'moderation_status' => ModerationStatus::Approved,
            'published_at' => $publishedAt ?? Carbon::now(),
            'reviewed_by' => User::factory()->admin(),
            'reviewed_at' => Carbon::now(),
            'rejection_reason' => null,
        ]);
    }

    public function changesRequested(string $reason = 'يرجى توضيح مساحة البلكونة وتحديث رخصة البناء'): static
    {
        return $this->state(fn (array $attributes) => [
            'moderation_status' => ModerationStatus::ChangesRequested,
            'published_at' => null,
            'reviewed_by' => User::factory()->admin(),
            'reviewed_at' => Carbon::now(),
            'rejection_reason' => $reason,
        ]);
    }

    public function rejected(string $reason = 'بيانات السعر غير حقيقية وتخالف شروط الإعلان'): static
    {
        return $this->state(fn (array $attributes) => [
            'moderation_status' => ModerationStatus::Rejected,
            'published_at' => null,
            'reviewed_by' => User::factory()->admin(),
            'reviewed_at' => Carbon::now(),
            'rejection_reason' => $reason,
        ]);
    }
}

