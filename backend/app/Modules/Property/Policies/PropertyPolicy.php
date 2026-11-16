<?php

declare(strict_types=1);

namespace App\Modules\Property\Policies;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use App\Modules\Property\Models\Property;

class PropertyPolicy
{
    public function view(User $user, Property $property): bool
    {
        return $this->isActiveOwner($user, $property);
    }

    public function update(User $user, Property $property): bool
    {
        return $this->isActiveOwner($user, $property) && $user->role !== UserRole::Admin;
    }

    public function delete(User $user, Property $property): bool
    {
        return $this->isActiveOwner($user, $property);
    }

    public function submit(User $user, Property $property): bool
    {
        return $this->isActiveOwner($user, $property);
    }

    public function resubmit(User $user, Property $property): bool
    {
        return $this->isActiveOwner($user, $property);
    }

    public function updateAvailability(User $user, Property $property): bool
    {
        return $this->isActiveOwner($user, $property);
    }

    public function manageMedia(User $user, Property $property): bool
    {
        return $this->isActiveOwner($user, $property) && $user->role !== UserRole::Admin;
    }

    private function isActiveOwner(User $user, Property $property): bool
    {
        return $user->status === UserStatus::Active
            && (int) $property->user_id === (int) $user->id;
    }
}
