<?php

declare(strict_types=1);

namespace App\Modules\Media\Controllers;

use App\Enums\DocumentType;
use App\Enums\ModerationStatus;
use App\Http\Controllers\Controller;
use App\Modules\Media\Models\PropertyDocument;
use App\Modules\Media\Models\PropertyImage;
use App\Modules\Media\Requests\UploadPropertyDocumentRequest;
use App\Modules\Media\Requests\UploadPropertyImagesRequest;
use App\Modules\Media\Resources\PropertyDocumentResource;
use App\Modules\Media\Resources\PropertyImageResource;
use App\Modules\Media\Services\PropertyMediaService;
use App\Modules\Property\Models\Property;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\Response;

class PropertyMediaController extends Controller
{
    public function __construct(
        private readonly PropertyMediaService $mediaService
    ) {}

    public function uploadImages(UploadPropertyImagesRequest $request, Property $property): JsonResponse
    {
        Gate::authorize('manageMedia', $property);

        $images = $this->mediaService->uploadImages($property, $request->file('images', []));

        if ($property->moderation_status === ModerationStatus::Approved) {
            $property->resetModerationForMediaEdit(
                $request->user(),
                'إعادة للمراجعة تلقائياً بعد إضافة صور جديدة للعقار'
            );
        }

        return ApiResponse::success([
            'images' => PropertyImageResource::collection($images),
            'moderation_status' => $property->moderation_status->value,
        ], 'تم رفع صور العقار بنجاح', Response::HTTP_CREATED);
    }

    public function setPrimaryImage(Request $request, Property $property, PropertyImage $image): JsonResponse
    {
        Gate::authorize('manageMedia', $property);

        if ((int) $image->property_id !== (int) $property->id) {
            abort(Response::HTTP_NOT_FOUND);
        }

        $updated = $this->mediaService->setPrimaryImage($property, $image);

        return ApiResponse::success(
            new PropertyImageResource($updated),
            'تم تعيين الصورة الرئيسية بنجاح'
        );
    }

    public function deleteImage(Request $request, Property $property, PropertyImage $image): JsonResponse
    {
        Gate::authorize('manageMedia', $property);

        if ((int) $image->property_id !== (int) $property->id) {
            abort(Response::HTTP_NOT_FOUND);
        }

        $this->mediaService->deleteImage($property, $image);

        if ($property->moderation_status === ModerationStatus::Approved) {
            $property->resetModerationForMediaEdit(
                $request->user(),
                'إعادة للمراجعة تلقائياً بعد حذف صورة من العقار'
            );
        }

        return ApiResponse::success([
            'moderation_status' => $property->moderation_status->value,
        ], 'تم حذف الصورة بنجاح');
    }

    public function uploadDocument(UploadPropertyDocumentRequest $request, Property $property): JsonResponse
    {
        Gate::authorize('manageMedia', $property);

        $documentType = DocumentType::from((string) $request->validated('document_type'));
        $document = $this->mediaService->uploadDocument(
            $property,
            $request->user(),
            $request->file('document'),
            $documentType
        );

        return ApiResponse::success(
            new PropertyDocumentResource($document),
            'تم رفع مستند التحقق بنجاح',
            Response::HTTP_CREATED
        );
    }

    public function deleteDocument(Request $request, Property $property, PropertyDocument $document): JsonResponse
    {
        Gate::authorize('manageMedia', $property);

        if ((int) $document->property_id !== (int) $property->id) {
            abort(Response::HTTP_NOT_FOUND);
        }

        $this->mediaService->deleteDocument($document);

        return ApiResponse::success(null, 'تم حذف المستند بنجاح');
    }
}
