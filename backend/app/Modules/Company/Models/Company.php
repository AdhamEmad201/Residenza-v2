<?php

declare(strict_types=1);

namespace App\Modules\Company\Models;

use App\Models\User;
use App\Modules\Property\Models\Property;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Company extends Model
{
    use HasFactory;

    public const RESERVED_SLUGS = [
        'admin',
        'api',
        'login',
        'register',
        'dashboard',
        'properties',
        'companies',
        'portal',
        'auth',
        'my-company',
        'sanctum',
        'storage',
        'about',
        'contact',
        'categories',
        'locations',
    ];

    protected $fillable = [
        'name',
        'slug',
        'logo_path',
        'cover_path',
        'bio',
        'address',
        'whatsapp',
        'phone',
        'accent_color',
    ];

    protected function casts(): array
    {
        return [
            'is_verified' => 'boolean',
            'max_properties' => 'integer',
            'plan_expires_at' => 'datetime',
            'views_count' => 'integer',
            'whatsapp_clicks' => 'integer',
            'phone_clicks' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Company $company) {
            if (trim((string) $company->slug) === '') {
                $company->slug = self::generateUniqueSlug((string) $company->name, $company->id);
            } else {
                $normalized = Str::slug((string) $company->slug, '-', 'ar');
                if ($normalized === '') {
                    $normalized = self::generateUniqueSlug((string) $company->name, $company->id);
                } else {
                    $company->slug = self::ensureUniqueSlug($normalized, $company->id);
                }
            }
        });
    }

    public static function generateUniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $base = Str::slug($name, '-', 'ar');
        if ($base === '') {
            $base = 'agency';
        }
        $base = Str::limit($base, 180, '');

        return self::ensureUniqueSlug($base, $ignoreId);
    }

    private static function ensureUniqueSlug(string $base, ?int $ignoreId = null): string
    {
        if (in_array(strtolower($base), self::RESERVED_SLUGS, true)) {
            $base .= '-agency';
        }

        $candidate = $base;
        $suffix = 1;

        while (
            in_array(strtolower($candidate), self::RESERVED_SLUGS, true) ||
            self::query()
                ->where('slug', $candidate)
                ->when($ignoreId !== null, fn ($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $suffix++;
            $candidate = $base . '-' . $suffix;
        }

        return $candidate;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class, 'company_id')->orderByDesc('created_at');
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class, 'company_id');
    }
}
