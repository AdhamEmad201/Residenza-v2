<?php

declare(strict_types=1);

namespace App\Modules\Media\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Media\Models\PropertyDocument;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DocumentDownloadController extends Controller
{
    public function __invoke(PropertyDocument $document): StreamedResponse
    {
        Gate::authorize('view', $document);

        if ($document->disk !== 'private' || !Storage::disk('private')->exists($document->file_path)) {
            abort(Response::HTTP_NOT_FOUND);
        }

        $safeFilename = $this->sanitizeHeaderFilename((string) ($document->original_name ?: 'document'));

        return Storage::disk('private')->response(
            $document->file_path,
            $safeFilename,
            [
                'Content-Type' => $document->mime_type,
                'Content-Disposition' => 'inline; filename="' . $safeFilename . '"',
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'private, no-store',
            ]
        );
    }

    private function sanitizeHeaderFilename(string $name): string
    {
        $clean = preg_replace('/[^A-Za-z0-9._-]/', '_', basename($name)) ?? 'document';
        $clean = trim($clean, '._');

        return $clean !== '' ? $clean : 'document';
    }
}
