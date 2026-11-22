<?php

declare(strict_types=1);

namespace App\Modules\Company\Models;

use App\Modules\Property\Models\Property;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Project extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'name',
        'slug',
        'location',
        'description',
        'cover_path',
    ];

    protected static function booted(): void
    {
        static::saving(function (Project $project) {
            if (trim((string) $project->slug) === '') {
                $base = Str::slug((string) $project->name, '-', 'ar');
                if ($base === '') {
                    $base = 'project';
                }
                $base = Str::limit($base, 180, '');
                $candidate = $base;
                $suffix = 1;

                while (
                    self::query()
                        ->where('company_id', $project->company_id)
                        ->where('slug', $candidate)
                        ->when($project->id !== null, fn ($q) => $q->where('id', '!=', $project->id))
                        ->exists()
                ) {
                    $suffix++;
                    $candidate = $base . '-' . $suffix;
                }

                $project->slug = $candidate;
            }
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class, 'project_id');
    }
}
