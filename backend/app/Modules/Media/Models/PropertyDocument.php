<?php

declare(strict_types=1);

namespace App\Modules\Media\Models;

use App\Enums\DocumentType;
use App\Models\User;
use App\Modules\Media\Policies\PropertyDocumentPolicy;
use App\Modules\Property\Models\Property;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[UsePolicy(PropertyDocumentPolicy::class)]
class PropertyDocument extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'uploaded_by',
        'document_type',
        'disk',
        'file_path',
        'original_name',
        'mime_type',
        'file_size_bytes',
    ];

    protected function casts(): array
    {
        return [
            'document_type' => DocumentType::class,
            'file_size_bytes' => 'integer',
        ];
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class, 'property_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
