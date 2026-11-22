<?php

declare(strict_types=1);

namespace App\Modules\Admin\Models;

use App\Modules\Property\Models\Property;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PropertyReport extends Model
{
    protected $fillable = [
        'property_id',
        'reporter_phone',
        'reason',
        'notes',
        'status',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class, 'property_id');
    }
}
