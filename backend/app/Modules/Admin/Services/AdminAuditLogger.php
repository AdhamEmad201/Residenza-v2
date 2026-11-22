<?php

declare(strict_types=1);

namespace App\Modules\Admin\Services;

use App\Models\User;
use App\Modules\Admin\Models\AdminAuditLog;

class AdminAuditLogger
{
    /**
     * Record a mutating admin action into admin_audit_logs.
     *
     * @param  array<string, mixed>|null  $details
     */
    public static function log(
        User $admin,
        string $action,
        string $targetType,
        ?int $targetId = null,
        ?array $details = null
    ): AdminAuditLog {
        return AdminAuditLog::query()->create([
            'admin_id' => $admin->id,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'details' => $details,
        ]);
    }
}
