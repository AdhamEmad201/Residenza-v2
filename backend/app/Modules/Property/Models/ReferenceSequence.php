<?php

declare(strict_types=1);

namespace App\Modules\Property\Models;

use Illuminate\Database\Eloquent\Model;

class ReferenceSequence extends Model
{
    public $timestamps = false;

    protected $table = 'reference_sequences';
    protected $primaryKey = 'year';
    public $incrementing = false;
    protected $keyType = 'int';

    protected $fillable = [
        'year',
        'current_sequence',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            'current_sequence' => 'integer',
            'updated_at' => 'datetime',
        ];
    }
}

