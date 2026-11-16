<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('properties', function (Blueprint $table) {
            $table->id();
            $table->string('reference_code', 30)->unique();
            $table->string('slug', 255)->unique();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('category_id')->constrained('categories')->restrictOnDelete();
            $table->foreignId('location_id')->constrained('locations')->restrictOnDelete();
            $table->string('transaction_type', 20); // 'sale', 'rent'
            $table->string('title_ar', 200);
            $table->text('description_ar');
            $table->decimal('price_egp', 14, 2);
            $table->decimal('area_sqm', 10, 2);
            $table->smallInteger('bedrooms')->nullable();
            $table->smallInteger('bathrooms')->nullable();
            $table->smallInteger('floor_level')->nullable();
            $table->string('finishing_type', 40)->nullable(); // 'core_and_shell', 'semi_finished', 'fully_finished', 'lux', 'super_lux'
            $table->string('address_details_ar', 300);
            $table->string('contact_phone', 25);
            $table->string('contact_whatsapp', 25);
            $table->string('moderation_status', 30)->default('pending_review'); // 'draft', 'pending_review', 'changes_requested', 'approved', 'rejected'
            $table->string('availability_status', 20)->default('available'); // 'available', 'sold', 'rented', 'hidden'
            $table->text('rejection_reason')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->softDeletes();
            $table->timestamps();

            // Composite indexes for performance & public marketplace filtering
            $table->index(['moderation_status', 'availability_status', 'transaction_type', 'category_id', 'location_id', 'published_at'], 'idx_properties_public_marketplace');
            $table->index(['moderation_status', 'availability_status', 'price_egp'], 'idx_properties_price');
            $table->index(['user_id', 'moderation_status', 'created_at'], 'idx_properties_user');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};
