<?php

declare(strict_types=1);

namespace App\Modules\Moderation\Models;

use App\Enums\ModerationStatus;
use App\Models\User;
use App\Modules\Property\Models\Property;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ModerationLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'property_id',
        'actor_id',
        'from_status',
        'to_status',
        'action',
        'notes',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'from_status' => ModerationStatus::class,
            'to_status' => ModerationStatus::class,
            'created_at' => 'datetime',
        ];
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class, 'property_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
