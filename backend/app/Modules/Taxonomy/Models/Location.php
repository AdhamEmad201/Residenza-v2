<?php

declare(strict_types=1);

namespace App\Modules\Taxonomy\Models;

use App\Enums\LocationType;
use App\Modules\Property\Models\Property;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class Location extends Model
{
    use HasFactory;

    protected $fillable = [
        'parent_id',
        'type',
        'name_ar',
        'name_en',
        'slug',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'type' => LocationType::class,
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Location $location) {
            $type = $location->type instanceof LocationType ? $location->type : LocationType::from((string) $location->type);

            // 1. Root vs. non-root parent_id nullability
            if ($type === LocationType::Governorate) {
                if ($location->parent_id !== null) {
                    throw new InvalidArgumentException('Governorate location must have parent_id = null (root node).');
                }
            } else {
                if ($location->parent_id === null) {
                    throw new InvalidArgumentException("Location of type '{$type->value}' must have a non-null parent_id.");
                }
            }

            // 2. Self-parenting and unbounded recursive cycle detection
            if ($location->parent_id !== null) {
                if ($location->exists && (int) $location->parent_id === (int) $location->id) {
                    throw new InvalidArgumentException('A location cannot be its own parent.');
                }

                if ($location->exists) {
                    $cycleDetected = DB::selectOne(
                        'WITH RECURSIVE ancestors(id, parent_id) AS (
                            SELECT id, parent_id FROM locations WHERE id = ?
                            UNION
                            SELECT l.id, l.parent_id
                            FROM locations l
                            JOIN ancestors a ON l.id = a.parent_id
                            WHERE a.parent_id IS NOT NULL
                        )
                        SELECT 1 AS found FROM ancestors WHERE id = ? LIMIT 1',
                        [(int) $location->parent_id, (int) $location->id]
                    );

                    if ($cycleDetected !== null) {
                        throw new InvalidArgumentException('Circular location hierarchy detected.');
                    }
                }

                // 3. Allowed-Parent Matrix validation
                $parent = Location::find($location->parent_id);
                if ($parent === null) {
                    throw new InvalidArgumentException('Parent location does not exist.');
                }

                $parentType = $parent->type instanceof LocationType ? $parent->type : LocationType::from((string) $parent->type);

                $allowedParents = match ($type) {
                    LocationType::Governorate => [],
                    LocationType::Markaz => [LocationType::Governorate],
                    LocationType::City => [LocationType::Governorate, LocationType::Markaz],
                    LocationType::District => [LocationType::City, LocationType::Markaz, LocationType::Governorate],
                    LocationType::Village => [LocationType::Markaz],
                };

                if (!in_array($parentType, $allowedParents, true)) {
                    throw new InvalidArgumentException("Location of type '{$type->value}' cannot have a parent of type '{$parentType->value}'.");
                }
            }

            // 4. Child compatibility on parent reclassification
            if ($location->exists && $location->isDirty('type')) {
                $newType = $type;
                foreach ($location->children as $child) {
                    $childType = $child->type instanceof LocationType ? $child->type : LocationType::from((string) $child->type);
                    $childAllowedParents = match ($childType) {
                        LocationType::Governorate => [],
                        LocationType::Markaz => [LocationType::Governorate],
                        LocationType::City => [LocationType::Governorate, LocationType::Markaz],
                        LocationType::District => [LocationType::City, LocationType::Markaz, LocationType::Governorate],
                        LocationType::Village => [LocationType::Markaz],
                    };

                    if (!in_array($newType, $childAllowedParents, true)) {
                        throw new InvalidArgumentException("Cannot reclassify location to '{$newType->value}' because child '{$child->slug}' of type '{$childType->value}' is incompatible.");
                    }
                }
            }
        });
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Location::class, 'parent_id')->orderBy('sort_order');
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class, 'location_id');
    }
}
