<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AccountType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@residenza.eg'],
            [
                'name' => 'مدير النظام',
                'phone' => '+201000000001',
                'whatsapp_number' => '+201000000001',
                'password' => Hash::make('ResidenzaAdmin2026!'),
                'role' => UserRole::Admin,
                'account_type' => AccountType::Admin,
                'company_name' => 'إدارة ريزيدنزا',
                'status' => UserStatus::Active,
            ]
        );
    }
}
