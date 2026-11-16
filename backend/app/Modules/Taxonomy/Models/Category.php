<?php

declare(strict_types=1);

namespace App\Modules\Taxonomy\Models;

use App\Enums\PropertyType;
use App\Modules\Property\Models\Property;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use InvalidArgumentException;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'parent_id',
        'property_type',
        'name_ar',
        'name_en',
        'slug',
        'icon',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'property_type' => PropertyType::class,
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Category $category) {
            // Self-parenting check
            if ($category->id !== null && $category->parent_id !== null && (int) $category->parent_id === (int) $category->id) {
                throw new InvalidArgumentException('A category cannot be its own parent.');
            }

            if ($category->parent_id !== null) {
                $parent = Category::find($category->parent_id);
                if ($parent === null) {
                    throw new InvalidArgumentException('Parent category does not exist.');
                }

                // Max 2-tier depth: Parent must be root (parent.parent_id IS NULL)
                if ($parent->parent_id !== null) {
                    throw new InvalidArgumentException('Subcategories can only be placed under a root category (maximum 2 total levels).');
                }

                // Reparenting guard: A category that already has children cannot be reparented under another category
                if ($category->exists && $category->children()->exists()) {
                    throw new InvalidArgumentException('Cannot reparent a category that already has child subcategories, as this would create a 3-level hierarchy.');
                }

                // Child must inherit/match parent property_type
                $parentType = $parent->property_type instanceof PropertyType ? $parent->property_type->value : $parent->property_type;
                $currentType = $category->property_type instanceof PropertyType ? $category->property_type->value : $category->property_type;

                if ($currentType !== $parentType) {
                    throw new InvalidArgumentException('Child category property_type must match parent category property_type.');
                }
            } else {
                // If existing root category updates property_type, all existing children must remain compatible
                if ($category->exists && $category->isDirty('property_type')) {
                    $newType = $category->property_type instanceof PropertyType ? $category->property_type->value : $category->property_type;
                    foreach ($category->children as $child) {
                        $childType = $child->property_type instanceof PropertyType ? $child->property_type->value : $child->property_type;
                        if ($childType !== $newType) {
                            throw new InvalidArgumentException('Cannot update root category property_type while existing child subcategories have a differing property_type.');
                        }
                    }
                }
            }
        });
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id')->orderBy('sort_order');
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class, 'category_id');
    }
}
