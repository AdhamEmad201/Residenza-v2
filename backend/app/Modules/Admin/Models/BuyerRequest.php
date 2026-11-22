<?php

declare(strict_types=1);

namespace App\Modules\Admin\Models;

use App\Modules\Company\Models\Company;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuyerRequest extends Model
{
    protected $fillable = [
        'name',
        'phone',
        'property_type',
        'area',
        'budget_max',
        'notes',
        'assigned_company_id',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'budget_max' => 'decimal:2',
        ];
    }

    public function assignedCompany(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'assigned_company_id');
    }
}
