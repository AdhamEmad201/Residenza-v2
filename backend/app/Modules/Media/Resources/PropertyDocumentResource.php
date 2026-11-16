<?php

declare(strict_types=1);

namespace App\Modules\Media\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PropertyDocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'property_id' => $this->property_id,
            'uploaded_by' => $this->uploaded_by,
            'document_type' => $this->document_type?->value ?? $this->document_type,
            'disk' => $this->disk,
            'file_path' => $this->file_path,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'file_size_bytes' => (int) $this->file_size_bytes,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
