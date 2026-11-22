<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'last_seen_at')) {
                $table->timestamp('last_seen_at')->nullable()->index();
            }
            if (! Schema::hasColumn('users', 'is_active')) {
                $table->boolean('is_active')->default(true);
            }
        });

        Schema::table('companies', function (Blueprint $table) {
            if (! Schema::hasColumn('companies', 'plan_tier')) {
                $table->string('plan_tier', 32)->default('free');
            }
            if (! Schema::hasColumn('companies', 'max_properties')) {
                $table->integer('max_properties')->default(5);
            }
            if (! Schema::hasColumn('companies', 'plan_expires_at')) {
                $table->timestamp('plan_expires_at')->nullable();
            }
            if (! Schema::hasColumn('companies', 'views_count')) {
                $table->unsignedBigInteger('views_count')->default(0);
            }
            if (! Schema::hasColumn('companies', 'whatsapp_clicks')) {
                $table->unsignedBigInteger('whatsapp_clicks')->default(0);
            }
            if (! Schema::hasColumn('companies', 'phone_clicks')) {
                $table->unsignedBigInteger('phone_clicks')->default(0);
            }
        });

        Schema::table('properties', function (Blueprint $table) {
            if (! Schema::hasColumn('properties', 'views_count')) {
                $table->unsignedBigInteger('views_count')->default(0);
            }
            if (! Schema::hasColumn('properties', 'whatsapp_clicks')) {
                $table->unsignedBigInteger('whatsapp_clicks')->default(0);
            }
            if (! Schema::hasColumn('properties', 'phone_clicks')) {
                $table->unsignedBigInteger('phone_clicks')->default(0);
            }
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $cols = array_values(array_filter([
                Schema::hasColumn('properties', 'views_count') ? 'views_count' : null,
                Schema::hasColumn('properties', 'whatsapp_clicks') ? 'whatsapp_clicks' : null,
                Schema::hasColumn('properties', 'phone_clicks') ? 'phone_clicks' : null,
            ]));
            if ($cols !== []) {
                $table->dropColumn($cols);
            }
        });

        Schema::table('companies', function (Blueprint $table) {
            $cols = array_values(array_filter([
                Schema::hasColumn('companies', 'plan_tier') ? 'plan_tier' : null,
                Schema::hasColumn('companies', 'max_properties') ? 'max_properties' : null,
                Schema::hasColumn('companies', 'plan_expires_at') ? 'plan_expires_at' : null,
                Schema::hasColumn('companies', 'views_count') ? 'views_count' : null,
                Schema::hasColumn('companies', 'whatsapp_clicks') ? 'whatsapp_clicks' : null,
                Schema::hasColumn('companies', 'phone_clicks') ? 'phone_clicks' : null,
            ]));
            if ($cols !== []) {
                $table->dropColumn($cols);
            }
        });

        Schema::table('users', function (Blueprint $table) {
            $cols = array_values(array_filter([
                Schema::hasColumn('users', 'last_seen_at') ? 'last_seen_at' : null,
                Schema::hasColumn('users', 'is_active') ? 'is_active' : null,
            ]));
            if ($cols !== []) {
                $table->dropColumn($cols);
            }
        });
    }
};
