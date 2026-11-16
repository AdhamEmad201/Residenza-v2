<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AccountType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthAndProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_individual_registration_succeeds_and_defaults_whatsapp(): void
    {
        $payload = [
            'name' => 'محمد أحمد',
            'email' => 'mohamed@example.com',
            'phone' => '+201012345678',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
            'account_type' => 'individual',
        ];

        $response = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
        ])->postJson('/api/v1/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'تم إنشاء الحساب بنجاح',
                'data' => [
                    'name' => 'محمد أحمد',
                    'email' => 'mohamed@example.com',
                    'phone' => '+201012345678',
                    'whatsapp_number' => '+201012345678',
                    'role' => 'user',
                    'account_type' => 'individual',
                    'status' => 'active',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'mohamed@example.com',
            'role' => 'user',
            'account_type' => 'individual',
            'status' => 'active',
            'whatsapp_number' => '+201012345678',
        ]);

        $this->assertAuthenticated('web');
    }

    public function test_broker_and_company_registration_require_company_name(): void
    {
        // Broker without company_name should fail
        $responseBrokerFail = $this->postJson('/api/v1/auth/register', [
            'name' => 'أحمد سمسار',
            'email' => 'broker@example.com',
            'phone' => '+201112345678',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
            'account_type' => 'broker',
        ]);

        $responseBrokerFail->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'VALIDATION_ERROR',
            ])
            ->assertJsonValidationErrors(['company_name']);

        // Company without company_name should fail
        $responseCompanyFail = $this->postJson('/api/v1/auth/register', [
            'name' => 'شركة سوهاج للتطوير',
            'email' => 'company@example.com',
            'phone' => '+201187654321',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
            'account_type' => 'company',
        ]);

        $responseCompanyFail->assertStatus(422)
            ->assertJson([
                'success' => false,
                'error_code' => 'VALIDATION_ERROR',
            ])
            ->assertJsonValidationErrors(['company_name']);

        // Broker with company_name should succeed
        $responseBrokerSuccess = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
        ])->postJson('/api/v1/auth/register', [
            'name' => 'أحمد سمسار',
            'email' => 'broker@example.com',
            'phone' => '+201112345678',
            'whatsapp_number' => '+201112345678',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
            'account_type' => 'broker',
            'company_name' => 'مكتب الصفا للعقارات',
        ]);

        $responseBrokerSuccess->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'account_type' => 'broker',
                    'company_name' => 'مكتب الصفا للعقارات',
                ],
            ]);

        // Company with company_name should succeed
        $responseCompanySuccess = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
        ])->postJson('/api/v1/auth/register', [
            'name' => 'شركة سوهاج للتطوير',
            'email' => 'company@example.com',
            'phone' => '+201187654321',
            'whatsapp_number' => '+201187654321',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
            'account_type' => 'company',
            'company_name' => 'شركة سوهاج للتطوير العقاري',
        ]);

        $responseCompanySuccess->assertStatus(201)
            ->assertJson([
                'success' => true,
                'data' => [
                    'account_type' => 'company',
                    'company_name' => 'شركة سوهاج للتطوير العقاري',
                ],
            ]);
    }

    public function test_privilege_escalation_is_strictly_blocked(): void
    {
        // 1. Trying to register with account_type=admin
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'مخترق',
            'email' => 'hacker@example.com',
            'phone' => '+201212345678',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
            'account_type' => 'admin',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['account_type']);

        // 2. Trying to pass role=admin in payload
        $responseRole = $this->postJson('/api/v1/auth/register', [
            'name' => 'مخترق 2',
            'email' => 'hacker2@example.com',
            'phone' => '+201512345678',
            'password' => 'StrongPass123!',
            'password_confirmation' => 'StrongPass123!',
            'account_type' => 'individual',
            'role' => 'admin',
            'status' => 'suspended',
        ]);

        $responseRole->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'hacker2@example.com',
            'role' => 'user',
            'status' => 'active',
        ]);
    }

    public function test_stateful_session_login_authenticated_session_and_logout(): void
    {
        $user = User::factory()->create([
            'email' => 'user@example.com',
            'password' => Hash::make('secret12345'),
        ]);

        // Wrong password
        $fail = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
        ])->postJson('/api/v1/auth/login', [
            'email' => 'user@example.com',
            'password' => 'wrong-pass',
        ]);

        $fail->assertStatus(401)
            ->assertJson([
                'success' => false,
                'error_code' => 'INVALID_CREDENTIALS',
            ]);

        // Valid login with stateful Origin
        $loginResponse = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
        ])->postJson('/api/v1/auth/login', [
            'email' => 'user@example.com',
            'password' => 'secret12345',
        ]);

        $loginResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'email' => 'user@example.com',
                ],
            ]);

        $this->assertAuthenticated('web');

        // Check me endpoint with stateful Origin
        $meResponse = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
        ])->getJson('/api/v1/auth/me');

        $meResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'id' => $user->id,
                    'email' => 'user@example.com',
                ],
            ]);

        // Logout with stateful Origin
        $logoutResponse = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
        ])->postJson('/api/v1/auth/logout');

        $logoutResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'تم تسجيل الخروج بنجاح',
            ]);

        $this->assertGuest('web');

        // Reset auth context for next request to simulate guest browser
        $this->flushSession();
        app('auth')->forgetGuards();

        // Subsequent me should return 401
        $meAfterLogout = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
        ])->getJson('/api/v1/auth/me');

        $meAfterLogout->assertStatus(401)
            ->assertJson([
                'success' => false,
                'error_code' => 'UNAUTHENTICATED',
            ]);
    }

    public function test_suspended_user_cannot_login_and_mid_session_suspension_blocks_access(): void
    {
        $suspendedUser = User::factory()->suspended()->create([
            'email' => 'suspended@example.com',
            'password' => Hash::make('secret12345'),
        ]);

        // Login attempt by suspended user
        $loginAttempt = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
        ])->postJson('/api/v1/auth/login', [
            'email' => 'suspended@example.com',
            'password' => 'secret12345',
        ]);

        $loginAttempt->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'ACCOUNT_SUSPENDED',
            ]);
        $this->assertGuest('web');

        // Mid-session suspension: start active session
        $activeUser = User::factory()->create([
            'email' => 'active@example.com',
            'password' => Hash::make('secret12345'),
            'status' => UserStatus::Active,
        ]);

        $loginActive = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
        ])->postJson('/api/v1/auth/login', [
            'email' => 'active@example.com',
            'password' => 'secret12345',
        ]);
        $loginActive->assertStatus(200);
        $this->assertAuthenticated('web');

        $activeMe = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
        ])->getJson('/api/v1/auth/me');
        $activeMe->assertStatus(200);

        // Suspend user directly in DB
        $activeUser->update(['status' => UserStatus::Suspended]);
        app('auth')->forgetGuards();

        // Accessing while suspended must return 403 and terminate session
        $blockedMe = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
        ])->getJson('/api/v1/auth/me');

        $blockedMe->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'ACCOUNT_SUSPENDED',
            ]);

        $this->assertGuest('web');
    }

    public function test_auth_rate_limiting_blocks_brute_force_attempts(): void
    {
        // Send 10 login requests (allowed within rate limit)
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'ratelimit@example.com',
                'password' => 'wrong',
            ]);
        }

        // 11th request must be throttled with HTTP 429
        $throttled = $this->postJson('/api/v1/auth/login', [
            'email' => 'ratelimit@example.com',
            'password' => 'wrong',
        ]);

        $throttled->assertStatus(429)
            ->assertJson([
                'success' => false,
                'error_code' => 'TOO_MANY_REQUESTS',
            ]);
    }

    public function test_admin_middleware_allows_only_admins(): void
    {
        $regularUser = User::factory()->create(['role' => UserRole::User]);
        $adminUser = User::factory()->admin()->create();

        // Guest calling admin endpoint
        $this->getJson('/api/v1/admin/ping')->assertStatus(401);

        // Regular user calling admin endpoint
        Sanctum::actingAs($regularUser);
        $this->getJson('/api/v1/admin/ping')
            ->assertStatus(403)
            ->assertJson([
                'success' => false,
                'error_code' => 'FORBIDDEN',
            ]);

        // Admin calling admin endpoint
        Sanctum::actingAs($adminUser);
        $this->getJson('/api/v1/admin/ping')
            ->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'admin' => true,
                ],
            ]);
    }

    public function test_profile_update_validation_ownership_and_restricted_fields_immutability(): void
    {
        $otherUser = User::factory()->create([
            'phone' => '+201099998888',
        ]);

        $user = User::factory()->create([
            'phone' => '+201011112222',
            'whatsapp_number' => '+201011112222',
            'password' => Hash::make('oldpassword123'),
            'role' => UserRole::User,
            'account_type' => AccountType::Individual,
            'company_name' => null,
            'status' => UserStatus::Active,
        ]);

        Sanctum::actingAs($user);

        // 1. Keeping own phone should succeed (self-excluded)
        $updateSelfPhone = $this->putJson('/api/v1/portal/profile', [
            'name' => 'اسم جديد',
            'phone' => '+201011112222',
        ]);
        $updateSelfPhone->assertStatus(200)
            ->assertJson([
                'success' => true,
                'data' => [
                    'name' => 'اسم جديد',
                    'phone' => '+201011112222',
                ],
            ]);

        // 2. Trying to take another user's phone should fail
        $updateOtherPhone = $this->putJson('/api/v1/portal/profile', [
            'name' => 'اسم جديد',
            'phone' => '+201099998888',
        ]);
        $updateOtherPhone->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);

        // 3. Password update requires current_password and confirmation
        $failPassword = $this->putJson('/api/v1/portal/profile', [
            'name' => 'اسم جديد',
            'phone' => '+201011112222',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'mismatch',
        ]);
        $failPassword->assertStatus(422)
            ->assertJsonValidationErrors(['current_password', 'password']);

        // Non-string current_password (e.g. array) must return 422, never 500 TypeError (H-02 hardening)
        $invalidTypePassword = $this->putJson('/api/v1/portal/profile', [
            'name' => 'اسم جديد',
            'phone' => '+201011112222',
            'current_password' => ['invalid', 'array'],
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);
        $invalidTypePassword->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);

        // Providing current_password when password is NOT being updated does NOT trigger validation failure (H-02)
        $autofillCurrentPassword = $this->putJson('/api/v1/portal/profile', [
            'name' => 'اسم معدل دون تغيير كلمة المرور',
            'phone' => '+201011112222',
            'current_password' => 'any-autofilled-value',
        ]);
        $autofillCurrentPassword->assertStatus(200);

        // Wrong current_password when updating password
        $wrongCurrentPass = $this->putJson('/api/v1/portal/profile', [
            'name' => 'اسم جديد',
            'phone' => '+201011112222',
            'current_password' => 'wrong-password',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);
        $wrongCurrentPass->assertStatus(422)
            ->assertJsonValidationErrors(['current_password']);

        // Valid password update
        $validPassUpdate = $this->putJson('/api/v1/portal/profile', [
            'name' => 'اسم جديد بالكامل',
            'phone' => '+201011112222',
            'current_password' => 'oldpassword123',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);
        $validPassUpdate->assertStatus(200);
        $this->assertTrue(Hash::check('NewPassword123!', $user->fresh()->password));

        // 4. Restricted fields immutability (role, status, account_type, id)
        $injectionAttempt = $this->putJson('/api/v1/portal/profile', [
            'id' => 9999,
            'name' => 'اسم معدل',
            'phone' => '+201011112222',
            'role' => 'admin',
            'status' => 'suspended',
            'account_type' => 'company',
        ]);
        $injectionAttempt->assertStatus(200);

        $refreshed = $user->fresh();
        $this->assertEquals(UserRole::User, $refreshed->role);
        $this->assertEquals(UserStatus::Active, $refreshed->status);
        $this->assertEquals(AccountType::Individual, $refreshed->account_type);
        $this->assertEquals($user->id, $refreshed->id);

        // 5. Individual user passing company_name has it stored as null (M-03)
        $individualCompanyAttempt = $this->putJson('/api/v1/portal/profile', [
            'name' => 'مستخدم فردي',
            'phone' => '+201011112222',
            'company_name' => 'شركة غير مصرح بها للأفراد',
        ]);
        $individualCompanyAttempt->assertStatus(200);
        $this->assertNull($user->fresh()->company_name);

        // 6. Updating profile without whatsapp_number preserves existing custom whatsapp (M-03)
        $user->update(['whatsapp_number' => '+201055554444']);
        $preserveWhatsapp = $this->putJson('/api/v1/portal/profile', [
            'name' => 'تحديث الاسم مع بقاء الواتساب',
            'phone' => '+201011112222',
        ]);
        $preserveWhatsapp->assertStatus(200);
        $this->assertEquals('+201055554444', $user->fresh()->whatsapp_number);

        // 7. Broker user cannot clear company_name to empty string or null (M-03)
        $brokerUser = User::factory()->broker('مكتب الإخلاص العقاري')->create([
            'phone' => '+201033334444',
        ]);
        Sanctum::actingAs($brokerUser);

        $brokerClearCompany = $this->putJson('/api/v1/portal/profile', [
            'name' => 'سمسار معتمد',
            'phone' => '+201033334444',
            'company_name' => '',
        ]);
        $brokerClearCompany->assertStatus(422)
            ->assertJsonValidationErrors(['company_name']);
    }
}
