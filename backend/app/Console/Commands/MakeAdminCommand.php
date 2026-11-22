<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Console\Command;

class MakeAdminCommand extends Command
{
    protected $signature = 'residenza:make-admin {email : The email address of the user to promote}';

    protected $description = 'Promote an existing user to active admin role by email';

    public function handle(): int
    {
        $email = trim((string) $this->argument('email'));
        $user = User::query()->where('email', $email)->first();

        if (! $user) {
            $this->error("User with email '{$email}' was not found.");

            return self::FAILURE;
        }

        $user->role = UserRole::Admin;
        $user->status = UserStatus::Active;
        $user->is_active = true;
        $user->save();

        $this->info("User '{$user->name}' ({$user->email}) is now an active RESIDENZA admin.");

        return self::SUCCESS;
    }
}
