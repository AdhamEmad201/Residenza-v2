<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\AccountType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $phone = '+2010' . fake()->unique()->numerify('########');

        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => $phone,
            'whatsapp_number' => $phone,
            'password' => static::$password ??= Hash::make('password'),
            'role' => UserRole::User,
            'account_type' => AccountType::Individual,
            'company_name' => null,
            'status' => UserStatus::Active,
            'remember_token' => Str::random(10),
        ];
    }

    public function broker(string $companyName = 'مكتب الصفوة العقاري'): static
    {
        return $this->state(fn (array $attributes) => [
            'account_type' => AccountType::Broker,
            'company_name' => $companyName,
        ]);
    }

    public function company(string $companyName = 'شركة سوهاج للتطوير العقاري'): static
    {
        return $this->state(fn (array $attributes) => [
            'account_type' => AccountType::Company,
            'company_name' => $companyName,
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => UserRole::Admin,
            'account_type' => AccountType::Admin,
            'company_name' => 'إدارة ريزيدنزا',
        ]);
    }

    public function suspended(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => UserStatus::Suspended,
        ]);
    }
}
