<?php

declare(strict_types=1);

namespace App\Modules\Moderation\Services;

use App\Enums\AvailabilityStatus;
use App\Models\User;
use App\Modules\Property\Models\Property;
use Illuminate\Support\Facades\DB;

class ModerationService
{
    /**
     * T3 (OD-01 = A): Create and unconditionally publish an official admin property.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function createDirectPublished(array $attributes, User $admin, ?string $notes = null): Property
    {
        return Property::createAdminPublished($attributes, $admin, $notes);
    }

    /**
     * T4: Approve a pending_review listing (strictly enforces Self-Approval Guard).
     */
    public function approve(Property $property, User $admin, ?string $notes = null): Property
    {
        return $property->approve($admin, $notes);
    }

    /**
     * T5: Request changes on a pending_review listing (mandatory reason).
     */
    public function requestChanges(Property $property, User $admin, string $reason): Property
    {
        return $property->requestChanges($admin, $reason);
    }

    /**
     * T6: Reject or revoke a listing (mandatory reason).
     */
    public function reject(Property $property, User $admin, string $reason): Property
    {
        return $property->reject($admin, $reason);
    }

    /**
     * T9 (Admin): Update availability status and/or featured flag without altering moderation_status.
     */
    public function updateAdminFlags(
        Property $property,
        User $admin,
        ?AvailabilityStatus $availabilityStatus = null,
        ?bool $isFeatured = null
    ): Property {
        return DB::transaction(function () use ($property, $admin, $availabilityStatus, $isFeatured) {
            if ($availabilityStatus !== null) {
                $property->setAvailability($availabilityStatus, $admin);
            }

            if ($isFeatured !== null) {
                $property->is_featured = $isFeatured;
                $property->save();
            }

            return $property;
        });
    }
}
