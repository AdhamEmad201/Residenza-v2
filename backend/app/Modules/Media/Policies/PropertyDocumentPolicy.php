<?php

declare(strict_types=1);

namespace App\Modules\Media\Policies;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use App\Modules\Media\Models\PropertyDocument;

class PropertyDocumentPolicy
{
    public function view(User $user, PropertyDocument $document): bool
    {
        if ($user->status !== UserStatus::Active) {
            return false;
        }

        if ($user->role === UserRole::Admin) {
            return true;
        }

        if ((int) $document->uploaded_by === (int) $user->id) {
            return true;
        }

        return $document->property !== null && (int) $document->property->user_id === (int) $user->id;
    }
}
