<?php

declare(strict_types=1);

namespace App\Modules\Company\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Company\Models\Company;
use App\Modules\Company\Models\Project;
use App\Modules\Company\Requests\StoreProjectRequest;
use App\Modules\Company\Requests\UpsertCompanyRequest;
use App\Modules\Company\Resources\CompanyResource;
use App\Modules\Company\Resources\ProjectResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class MyCompanyController extends Controller
{
    private const ALLOWED_IMAGE_MIMES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];
    public function show(Request $request): JsonResponse
    {
        $company = $request->user()->company()->with('projects')->first();

        return ApiResponse::success(
            $company ? new CompanyResource($company) : null,
            $company ? 'تم جلب بيانات الشركة بنجاح' : 'لا يوجد ملف شركة مسجل بعد'
        );
    }

    public function upsert(UpsertCompanyRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        $company = $user->company()->first() ?? new Company();
        $company->user_id = $user->id;
        $company->name = (string) $data['name'];

        if (array_key_exists('slug', $data) && trim((string) $data['slug']) !== '') {
            $company->slug = (string) $data['slug'];
        } elseif (! $company->exists) {
            $company->slug = '';
        }

        $company->bio = $data['bio'] ?? $company->bio;
        $company->address = $data['address'] ?? $company->address;
        $company->whatsapp = $data['whatsapp'] ?? ($company->whatsapp ?? $user->whatsapp_number);
        $company->phone = $data['phone'] ?? ($company->phone ?? $user->phone);
        $company->accent_color = $data['accent_color'] ?? ($company->accent_color ?: '#9F7753');

        if ($request->hasFile('logo')) {
            $newLogoPath = $this->storePublicImage($request->file('logo'), 'companies/logos', 'logo');
            if ($company->logo_path && str_starts_with($company->logo_path, 'companies/logos/') && ! str_contains($company->logo_path, '..')) {
                Storage::disk('public')->delete($company->logo_path);
            }
            $company->logo_path = $newLogoPath;
        }

        if ($request->hasFile('cover')) {
            $newCoverPath = $this->storePublicImage($request->file('cover'), 'companies/covers', 'cover');
            if ($company->cover_path && str_starts_with($company->cover_path, 'companies/covers/') && ! str_contains($company->cover_path, '..')) {
                Storage::disk('public')->delete($company->cover_path);
            }
            $company->cover_path = $newCoverPath;
        }

        $company->save();
        $company->load('projects');

        return ApiResponse::success(
            new CompanyResource($company),
            'تم حفظ واجهة الشركة بنجاح'
        );
    }

    public function storeProject(StoreProjectRequest $request): JsonResponse
    {
        $company = $request->user()->company()->first();

        if (! $company) {
            return ApiResponse::error(
                'يجب إنشاء ملف الشركة أولاً قبل إضافة المشروعات.',
                'COMPANY_REQUIRED',
                Response::HTTP_UNPROCESSABLE_ENTITY
            );
        }

        $data = $request->validated();

        $coverPath = null;
        if ($request->hasFile('cover')) {
            $coverPath = $this->storePublicImage($request->file('cover'), 'companies/projects', 'cover');
        }

        $project = Project::create([
            'company_id' => $company->id,
            'name' => (string) $data['name'],
            'slug' => (string) ($data['slug'] ?? ''),
            'location' => (string) $data['location'],
            'description' => $data['description'] ?? null,
            'cover_path' => $coverPath,
        ]);

        return ApiResponse::success(
            new ProjectResource($project),
            'تم إضافة المشروع بنجاح',
            Response::HTTP_CREATED
        );
    }

    public function destroyProject(Request $request, int $id): JsonResponse
    {
        $company = $request->user()->company()->first();

        if (! $company) {
            return ApiResponse::error(
                'غير مصرح لك بحذف هذا المشروع.',
                'FORBIDDEN',
                Response::HTTP_FORBIDDEN
            );
        }

        $project = Project::query()
            ->where('id', $id)
            ->where('company_id', $company->id)
            ->firstOrFail();

        if ($project->cover_path) {
            Storage::disk('public')->delete($project->cover_path);
        }

        $project->delete();

        return ApiResponse::success(null, 'تم حذف المشروع بنجاح');
    }

    private function storePublicImage(UploadedFile $file, string $directory, string $field = 'image'): string
    {
        $realPath = $file->getRealPath();
        $finfo = $realPath !== false ? finfo_open(FILEINFO_MIME_TYPE) : false;
        $detectedMime = $finfo !== false ? (string) finfo_file($finfo, (string) $realPath) : '';
        if ($finfo !== false) {
            finfo_close($finfo);
        }

        if (! isset(self::ALLOWED_IMAGE_MIMES[$detectedMime])) {
            throw ValidationException::withMessages([
                $field => ['نوع الصورة الفعلي غير مدعوم أو غير صالح. يُسمح فقط بـ JPG و PNG و WebP.'],
            ]);
        }

        $extension = self::ALLOWED_IMAGE_MIMES[$detectedMime];
        $filename = Str::uuid()->toString() . '.' . $extension;

        return (string) $file->storeAs($directory, $filename, 'public');
    }
}
