<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('admin_audit_logs')) {
            Schema::create('admin_audit_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('admin_id')->constrained('users')->onDelete('cascade');
                $table->string('action', 120);
                $table->string('target_type', 120);
                $table->unsignedBigInteger('target_id')->nullable();
                $table->text('details')->nullable();
                $table->timestamp('created_at')->nullable()->useCurrent();
                $table->index(['target_type', 'target_id']);
                $table->index('created_at');
            });
        }

        if (! Schema::hasTable('areas')) {
            Schema::create('areas', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('city')->default('سوهاج');
                $table->boolean('is_active')->default(true);
                $table->unsignedBigInteger('search_count')->default(0);
                $table->timestamps();
            });

            $now = now();
            $defaultAreas = ['الكوامل', 'سوهاج الجديدة', 'حي راشد', 'أخميم', 'طهطا', 'جرجا'];
            foreach ($defaultAreas as $areaName) {
                DB::table('areas')->insertOrIgnore([
                    'name' => $areaName,
                    'city' => 'سوهاج',
                    'is_active' => true,
                    'search_count' => 0,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        if (! Schema::hasTable('property_reports')) {
            Schema::create('property_reports', function (Blueprint $table) {
                $table->id();
                $table->foreignId('property_id')->constrained('properties')->onDelete('cascade');
                $table->string('reporter_phone', 40)->nullable();
                $table->string('reason');
                $table->text('notes')->nullable();
                $table->string('status', 32)->default('open')->index();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('buyer_requests')) {
            Schema::create('buyer_requests', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('phone', 40);
                $table->string('property_type', 100);
                $table->string('area');
                $table->decimal('budget_max', 14, 2)->nullable();
                $table->text('notes')->nullable();
                $table->foreignId('assigned_company_id')->nullable()->constrained('companies')->onDelete('set null');
                $table->string('status', 32)->default('new')->index();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('site_settings')) {
            Schema::create('site_settings', function (Blueprint $table) {
                $table->string('key')->primary();
                $table->text('value')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('site_settings');
        Schema::dropIfExists('buyer_requests');
        Schema::dropIfExists('property_reports');
        Schema::dropIfExists('areas');
        Schema::dropIfExists('admin_audit_logs');
    }
};
