<?php

declare(strict_types=1);

namespace App\Modules\Media\Services;

use App\Enums\DocumentType;
use App\Models\User;
use App\Modules\Media\Models\PropertyDocument;
use App\Modules\Media\Models\PropertyImage;
use App\Modules\Property\Models\Property;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PropertyMediaService
{
    public const MAX_IMAGES_PER_PROPERTY = 15;
    public const MAX_DOCUMENTS_PER_PROPERTY = 5;
    public const MAX_IMAGE_SIZE_BYTES = 5242880; // 5 MB
    public const MAX_DOCUMENT_SIZE_BYTES = 10485760; // 10 MB

    private const ALLOWED_IMAGE_MIMES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    private const ALLOWED_DOCUMENT_MIMES = [
        'application/pdf' => 'pdf',
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    /**
     * @param  array<int, UploadedFile>  $files
     * @return Collection<int, PropertyImage>
     */
    public function uploadImages(Property $property, array $files): Collection
    {
        $existingCount = $property->images()->count();
        if ($existingCount + count($files) > self::MAX_IMAGES_PER_PROPERTY) {
            throw ValidationException::withMessages([
                'images' => ['الحد الأقصى للصور لكل عقار هو 15 صورة.'],
            ]);
        }

        $validatedFiles = [];
        foreach ($files as $index => $file) {
            $mime = $this->detectMimeWithFinfo($file);
            if (!isset(self::ALLOWED_IMAGE_MIMES[$mime])) {
                throw ValidationException::withMessages([
                    "images.{$index}" => ['نوع ملف الصورة غير مسموح به (يُسمح فقط بـ JPEG, PNG, WEBP).'],
                ]);
            }

            $size = (int) $file->getSize();
            if ($size <= 0 || $size > self::MAX_IMAGE_SIZE_BYTES) {
                throw ValidationException::withMessages([
                    "images.{$index}" => ['حجم الصورة يجب ألا يتجاوز 5 ميجابايت.'],
                ]);
            }

            $dimensions = @getimagesize($file->getRealPath());
            if ($dimensions === false || $dimensions[0] < 300 || $dimensions[1] < 300 || $dimensions[0] > 6000 || $dimensions[1] > 6000) {
                throw ValidationException::withMessages([
                    "images.{$index}" => ['أبعاد الصورة يجب أن تكون بين 300×300 و 6000×6000 بكسل.'],
                ]);
            }

            $validatedFiles[] = [
                'file' => $file,
                'mime' => $mime,
                'ext' => self::ALLOWED_IMAGE_MIMES[$mime],
                'size' => $size,
            ];
        }

        $storedPaths = [];

        try {
            return DB::transaction(function () use ($property, $validatedFiles, &$storedPaths) {
                $hasPrimary = $property->images()->where('is_primary', true)->exists();
                $nextSortOrder = (int) ($property->images()->max('sort_order') ?? -1) + 1;
                $created = collect();

                foreach ($validatedFiles as $idx => $item) {
                    $filename = Str::uuid()->toString() . '.' . $item['ext'];
                    $directory = "properties/{$property->id}";
                    $path = Storage::disk('public')->putFileAs($directory, $item['file'], $filename);

                    if ($path === false) {
                        throw new \RuntimeException('Failed to store property image on public disk.');
                    }

                    $storedPaths[] = $path;
                    $isPrimary = !$hasPrimary && $idx === 0;

                    $image = $property->images()->create([
                        'disk' => 'public',
                        'file_path' => $path,
                        'mime_type' => $item['mime'],
                        'file_size_bytes' => $item['size'],
                        'is_primary' => $isPrimary,
                        'sort_order' => $nextSortOrder + $idx,
                    ]);

                    if ($isPrimary) {
                        $hasPrimary = true;
                    }

                    $created->push($image);
                }

                return $created;
            });
        } catch (\Throwable $e) {
            foreach ($storedPaths as $path) {
                Storage::disk('public')->delete($path);
            }
            throw $e;
        }
    }

    public function setPrimaryImage(Property $property, PropertyImage $image): PropertyImage
    {
        return DB::transaction(function () use ($property, $image) {
            $property->images()->update(['is_primary' => false]);
            $image->is_primary = true;
            $image->save();

            return $image->fresh();
        });
    }

    public function deleteImage(Property $property, PropertyImage $image): void
    {
        $disk = $image->disk ?: 'public';
        $path = $image->file_path;
        $wasPrimary = (bool) $image->is_primary;

        DB::transaction(function () use ($property, $image, $wasPrimary) {
            $image->delete();

            if ($wasPrimary) {
                $next = $property->images()->orderBy('sort_order')->orderBy('id')->first();
                if ($next !== null) {
                    $next->is_primary = true;
                    $next->save();
                }
            }
        });

        Storage::disk($disk)->delete($path);
    }

    public function uploadDocument(
        Property $property,
        User $uploader,
        UploadedFile $file,
        DocumentType $documentType
    ): PropertyDocument {
        $existingCount = $property->documents()->count();
        if ($existingCount >= self::MAX_DOCUMENTS_PER_PROPERTY) {
            throw ValidationException::withMessages([
                'document' => ['الحد الأقصى للمستندات لكل عقار هو 5 مستندات.'],
            ]);
        }

        $mime = $this->detectMimeWithFinfo($file);
        if (!isset(self::ALLOWED_DOCUMENT_MIMES[$mime])) {
            throw ValidationException::withMessages([
                'document' => ['نوع المستند غير مسموح به (يُسمح فقط بـ PDF, JPEG, PNG, WEBP).'],
            ]);
        }

        $size = (int) $file->getSize();
        if ($size <= 0 || $size > self::MAX_DOCUMENT_SIZE_BYTES) {
            throw ValidationException::withMessages([
                'document' => ['حجم المستند يجب ألا يتجاوز 10 ميجابايت.'],
            ]);
        }

        $ext = self::ALLOWED_DOCUMENT_MIMES[$mime];
        $filename = Str::uuid()->toString() . '.' . $ext;
        $directory = "property_documents/{$property->id}";
        $originalName = $this->sanitizeOriginalName($file->getClientOriginalName());

        $path = Storage::disk('private')->putFileAs($directory, $file, $filename);
        if ($path === false) {
            throw new \RuntimeException('Failed to store property document on private disk.');
        }

        try {
            return $property->documents()->create([
                'uploaded_by' => $uploader->id,
                'document_type' => $documentType->value,
                'disk' => 'private',
                'file_path' => $path,
                'original_name' => $originalName,
                'mime_type' => $mime,
                'file_size_bytes' => $size,
            ]);
        } catch (\Throwable $e) {
            Storage::disk('private')->delete($path);
            throw $e;
        }
    }

    public function deleteDocument(PropertyDocument $document): void
    {
        $disk = $document->disk ?: 'private';
        $path = $document->file_path;

        $document->delete();
        Storage::disk($disk)->delete($path);
    }

    private function detectMimeWithFinfo(UploadedFile $file): string
    {
        $realPath = $file->getRealPath();
        if ($realPath === false || !is_file($realPath)) {
            return '';
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $detected = $finfo->file($realPath);

        return is_string($detected) ? $detected : '';
    }

    private function sanitizeOriginalName(string $name): string
    {
        $base = basename(str_replace('\\', '/', $name));
        $clean = preg_replace('/[\x00-\x1F\x7F]/u', '', $base) ?? 'document';
        $clean = trim($clean);

        if ($clean === '') {
            return 'document';
        }

        return Str::limit($clean, 250, '');
    }
}
