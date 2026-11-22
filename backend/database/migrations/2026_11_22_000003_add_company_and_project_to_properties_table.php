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
        if (DB::getDriverName() === 'sqlite') {
            if (! Schema::hasColumn('properties', 'company_id')) {
                DB::statement('ALTER TABLE properties ADD COLUMN company_id INTEGER NULL REFERENCES companies(id) ON DELETE SET NULL');
                DB::statement('CREATE INDEX IF NOT EXISTS properties_company_id_index ON properties (company_id)');
            }

            if (! Schema::hasColumn('properties', 'project_id')) {
                DB::statement('ALTER TABLE properties ADD COLUMN project_id INTEGER NULL REFERENCES projects(id) ON DELETE SET NULL');
                DB::statement('CREATE INDEX IF NOT EXISTS properties_project_id_index ON properties (project_id)');
            }

            return;
        }

        Schema::table('properties', function (Blueprint $table) {
            if (! Schema::hasColumn('properties', 'company_id')) {
                $table->foreignId('company_id')
                    ->nullable()
                    ->after('user_id')
                    ->constrained('companies')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('properties', 'project_id')) {
                $table->foreignId('project_id')
                    ->nullable()
                    ->after('company_id')
                    ->constrained('projects')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            if (Schema::hasColumn('properties', 'project_id')) {
                DB::statement('DROP INDEX IF EXISTS properties_project_id_index');
                DB::statement('ALTER TABLE properties DROP COLUMN project_id');
            }
            if (Schema::hasColumn('properties', 'company_id')) {
                DB::statement('DROP INDEX IF EXISTS properties_company_id_index');
                DB::statement('ALTER TABLE properties DROP COLUMN company_id');
            }

            return;
        }

        Schema::table('properties', function (Blueprint $table) {
            if (Schema::hasColumn('properties', 'project_id')) {
                $table->dropConstrainedForeignId('project_id');
            }
            if (Schema::hasColumn('properties', 'company_id')) {
                $table->dropConstrainedForeignId('company_id');
            }
        });
    }
};
