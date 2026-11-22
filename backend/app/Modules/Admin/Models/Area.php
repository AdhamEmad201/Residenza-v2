<?php

declare(strict_types=1);

namespace App\Modules\Admin\Models;

use Illuminate\Database\Eloquent\Model;

class Area extends Model
{
    protected $fillable = [
        'name',
        'city',
        'is_active',
        'search_count',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'search_count' => 'integer',
        ];
    }
}
