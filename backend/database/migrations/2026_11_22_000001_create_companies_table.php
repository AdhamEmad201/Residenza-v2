<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('companies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('name', 200);
            $table->string('slug', 220)->unique();
            $table->string('logo_path', 500)->nullable();
            $table->string('cover_path', 500)->nullable();
            $table->text('bio')->nullable();
            $table->string('address', 300)->nullable();
            $table->string('whatsapp', 30)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('accent_color', 20)->default('#9F7753');
            $table->boolean('is_verified')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('companies');
    }
};
