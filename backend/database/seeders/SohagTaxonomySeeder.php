<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\LocationType;
use App\Enums\PropertyType;
use App\Modules\Taxonomy\Models\Category;
use App\Modules\Taxonomy\Models\Location;
use Illuminate\Database\Seeder;

class SohagTaxonomySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Property Categories (7 canonical root categories preserved)
        $categories = [
            ['name_ar' => 'شقة سكنية', 'name_en' => 'Apartment', 'slug' => 'apartment', 'property_type' => PropertyType::Residential, 'sort_order' => 1],
            ['name_ar' => 'فيلا', 'name_en' => 'Villa', 'slug' => 'villa', 'property_type' => PropertyType::Residential, 'sort_order' => 2],
            ['name_ar' => 'أرض سكنية / مباني', 'name_en' => 'Residential Land', 'slug' => 'residential-land', 'property_type' => PropertyType::Land, 'sort_order' => 3],
            ['name_ar' => 'محل تجاري', 'name_en' => 'Commercial Shop', 'slug' => 'commercial-shop', 'property_type' => PropertyType::Commercial, 'sort_order' => 4],
            ['name_ar' => 'مقر إداري / عيادة', 'name_en' => 'Office / Clinic', 'slug' => 'office-clinic', 'property_type' => PropertyType::Administrative, 'sort_order' => 5],
            ['name_ar' => 'عمارة كاملة', 'name_en' => 'Entire Building', 'slug' => 'building', 'property_type' => PropertyType::Residential, 'sort_order' => 6],
            ['name_ar' => 'استراحة / شاليه', 'name_en' => 'Chalet / Rest House', 'slug' => 'chalet', 'property_type' => PropertyType::Residential, 'sort_order' => 7],
        ];

        foreach ($categories as $cat) {
            Category::updateOrCreate(
                ['slug' => $cat['slug']],
                [
                    'parent_id' => null,
                    'property_type' => $cat['property_type'],
                    'name_ar' => $cat['name_ar'],
                    'name_en' => $cat['name_en'],
                    'sort_order' => $cat['sort_order'],
                    'is_active' => true,
                ]
            );
        }

        // 2. Sohag Geographic Hierarchy (1 Root + 14 direct children + 1 under markaz-sohag + 22 under cities/marakiz = 38 Total)
        // Step A: Root Governorate
        $gov = Location::updateOrCreate(
            ['parent_id' => null, 'slug' => 'sohag-governorate'],
            [
                'type' => LocationType::Governorate,
                'name_ar' => 'محافظة سوهاج',
                'name_en' => 'Sohag Governorate',
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        // Step B: Direct Children under Governorate (14 nodes)
        // B1: Markaz Sohag
        $markazSohag = Location::updateOrCreate(
            ['parent_id' => $gov->id, 'slug' => 'markaz-sohag'],
            [
                'type' => LocationType::Markaz,
                'name_ar' => 'مركز سوهاج',
                'name_en' => 'Markaz Sohag',
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        // Under Markaz Sohag: Sohag City (1 node)
        $sohagCity = Location::updateOrCreate(
            ['parent_id' => $markazSohag->id, 'slug' => 'sohag-city'],
            [
                'type' => LocationType::City,
                'name_ar' => 'مدينة سوهاج',
                'name_en' => 'Sohag City',
                'sort_order' => 1,
                'is_active' => true,
            ]
        );

        // Under Sohag City: 10 Districts
        $sohagCityDistricts = [
            ['name_ar' => 'حي الشرق', 'name_en' => 'Hayy Sharq', 'slug' => 'hayy-sharq', 'sort_order' => 1],
            ['name_ar' => 'حي الغرب', 'name_en' => 'Hayy Gharb', 'slug' => 'hayy-gharb', 'sort_order' => 2],
            ['name_ar' => 'منطقة الزهراء', 'name_en' => 'Al Zahraa', 'slug' => 'al-zahraa', 'sort_order' => 3],
            ['name_ar' => 'منطقة الأرقم', 'name_en' => 'Al Arqam', 'slug' => 'al-arqam', 'sort_order' => 4],
            ['name_ar' => 'ميدان الثقافة', 'name_en' => 'Al Thaqafa Square', 'slug' => 'al-thaqafa', 'sort_order' => 5],
            ['name_ar' => 'شارع 15', 'name_en' => '15th Street', 'slug' => '15th-street', 'sort_order' => 6],
            ['name_ar' => 'شارع الجمهورية', 'name_en' => 'Al Gomhoreya Street', 'slug' => 'al-gomhoreya', 'sort_order' => 7],
            ['name_ar' => 'كورنيش النيل الشرقي', 'name_en' => 'Eastern Nile Corniche', 'slug' => 'corniche-sharq', 'sort_order' => 8],
            ['name_ar' => 'كورنيش النيل الغربي', 'name_en' => 'Western Nile Corniche', 'slug' => 'corniche-gharb', 'sort_order' => 9],
            ['name_ar' => 'منطقة سيتي', 'name_en' => 'City Area', 'slug' => 'city-area', 'sort_order' => 10],
        ];

        foreach ($sohagCityDistricts as $d) {
            Location::updateOrCreate(
                ['parent_id' => $sohagCity->id, 'slug' => $d['slug']],
                [
                    'type' => LocationType::District,
                    'name_ar' => $d['name_ar'],
                    'name_en' => $d['name_en'],
                    'sort_order' => $d['sort_order'],
                    'is_active' => true,
                ]
            );
        }

        // B2: New Sohag City (NUCA New City directly under Governorate)
        $newSohag = Location::updateOrCreate(
            ['parent_id' => $gov->id, 'slug' => 'new-sohag'],
            [
                'type' => LocationType::City,
                'name_ar' => 'مدينة سوهاج الجديدة',
                'name_en' => 'New Sohag City',
                'sort_order' => 2,
                'is_active' => true,
            ]
        );

        // Under New Sohag City: 6 Districts
        $newSohagDistricts = [
            ['name_ar' => 'الحي الأول', 'name_en' => 'First District', 'slug' => 'new-sohag-d1', 'sort_order' => 1],
            ['name_ar' => 'الحي الثاني', 'name_en' => 'Second District', 'slug' => 'new-sohag-d2', 'sort_order' => 2],
            ['name_ar' => 'الحي الثالث', 'name_en' => 'Third District', 'slug' => 'new-sohag-d3', 'sort_order' => 3],
            ['name_ar' => 'منطقة الفيلات', 'name_en' => 'Villas Area', 'slug' => 'new-sohag-villas', 'sort_order' => 4],
            ['name_ar' => 'مشروع ابني بيتك', 'name_en' => 'Ebny Betak', 'slug' => 'new-sohag-ebny-betak', 'sort_order' => 5],
            ['name_ar' => 'منطقة النخيل', 'name_en' => 'Al Nakheel Area', 'slug' => 'new-sohag-nakheel', 'sort_order' => 6],
        ];

        foreach ($newSohagDistricts as $d) {
            Location::updateOrCreate(
                ['parent_id' => $newSohag->id, 'slug' => $d['slug']],
                [
                    'type' => LocationType::District,
                    'name_ar' => $d['name_ar'],
                    'name_en' => $d['name_en'],
                    'sort_order' => $d['sort_order'],
                    'is_active' => true,
                ]
            );
        }

        // B3: New Akhmim City (NUCA New City under Governorate)
        Location::updateOrCreate(
            ['parent_id' => $gov->id, 'slug' => 'new-akhmim'],
            [
                'type' => LocationType::City,
                'name_ar' => 'مدينة أخميم الجديدة',
                'name_en' => 'New Akhmim City',
                'sort_order' => 3,
                'is_active' => true,
            ]
        );

        // B4: Hayy Al Kawthar (Industrial/Urban District under Governorate)
        Location::updateOrCreate(
            ['parent_id' => $gov->id, 'slug' => 'al-kawthar'],
            [
                'type' => LocationType::District,
                'name_ar' => 'حي الكوثر',
                'name_en' => 'Hayy Al Kawthar',
                'sort_order' => 4,
                'is_active' => true,
            ]
        );

        // B5: Markaz Akhmim
        $akhmim = Location::updateOrCreate(
            ['parent_id' => $gov->id, 'slug' => 'akhmim'],
            [
                'type' => LocationType::Markaz,
                'name_ar' => 'مركز ومدينة أخميم',
                'name_en' => 'Akhmim',
                'sort_order' => 5,
                'is_active' => true,
            ]
        );

        // Under Akhmim: 1 city + 2 villages
        Location::updateOrCreate(
            ['parent_id' => $akhmim->id, 'slug' => 'akhmim-city'],
            ['type' => LocationType::City, 'name_ar' => 'مدينة أخميم', 'name_en' => 'Akhmim City', 'sort_order' => 1, 'is_active' => true]
        );
        Location::updateOrCreate(
            ['parent_id' => $akhmim->id, 'slug' => 'akhmim-nida'],
            ['type' => LocationType::Village, 'name_ar' => 'قرية نيدة', 'name_en' => 'Nida', 'sort_order' => 2, 'is_active' => true]
        );
        Location::updateOrCreate(
            ['parent_id' => $akhmim->id, 'slug' => 'akhmim-hawawish'],
            ['type' => LocationType::Village, 'name_ar' => 'قرية الحواويش', 'name_en' => 'Hawawish', 'sort_order' => 3, 'is_active' => true]
        );

        // B6: Markaz Tahta
        $tahta = Location::updateOrCreate(
            ['parent_id' => $gov->id, 'slug' => 'tahta'],
            [
                'type' => LocationType::Markaz,
                'name_ar' => 'مركز ومدينة طهطا',
                'name_en' => 'Tahta',
                'sort_order' => 6,
                'is_active' => true,
            ]
        );

        // Under Tahta: 1 city + 1 district
        Location::updateOrCreate(
            ['parent_id' => $tahta->id, 'slug' => 'tahta-city'],
            ['type' => LocationType::City, 'name_ar' => 'مدينة طهطا', 'name_en' => 'Tahta City', 'sort_order' => 1, 'is_active' => true]
        );
        Location::updateOrCreate(
            ['parent_id' => $tahta->id, 'slug' => 'sahel-tahta'],
            ['type' => LocationType::District, 'name_ar' => 'ساحل طهطا', 'name_en' => 'Sahel Tahta', 'sort_order' => 2, 'is_active' => true]
        );

        // B7: Markaz Girga
        $girga = Location::updateOrCreate(
            ['parent_id' => $gov->id, 'slug' => 'girga'],
            [
                'type' => LocationType::Markaz,
                'name_ar' => 'مركز ومدينة جرجا',
                'name_en' => 'Girga',
                'sort_order' => 7,
                'is_active' => true,
            ]
        );

        // Under Girga: 1 city
        Location::updateOrCreate(
            ['parent_id' => $girga->id, 'slug' => 'girga-city'],
            ['type' => LocationType::City, 'name_ar' => 'مدينة جرجا', 'name_en' => 'Girga City', 'sort_order' => 1, 'is_active' => true]
        );

        // B8..B14: Other Marakiz directly under Governorate
        $otherMarakiz = [
            ['slug' => 'al-maragha', 'name_ar' => 'مركز ومدينة المراغة', 'name_en' => 'Al Maragha', 'sort_order' => 8],
            ['slug' => 'tima', 'name_ar' => 'مركز ومدينة طما', 'name_en' => 'Tima', 'sort_order' => 9],
            ['slug' => 'al-balyana', 'name_ar' => 'مركز ومدينة البلينا', 'name_en' => 'Al Balyana', 'sort_order' => 10],
            ['slug' => 'al-monshaah', 'name_ar' => 'مركز ومدينة المنشأة', 'name_en' => 'Al Monshaah', 'sort_order' => 11],
            ['slug' => 'saqalta', 'name_ar' => 'مركز ومدينة ساقلتة', 'name_en' => 'Saqalta', 'sort_order' => 12],
            ['slug' => 'guhayna', 'name_ar' => 'مركز ومدينة جهينة', 'name_en' => 'Guhayna', 'sort_order' => 13],
            ['slug' => 'dar-el-salam', 'name_ar' => 'مركز ومدينة دار السلام', 'name_en' => 'Dar El Salam', 'sort_order' => 14],
        ];

        foreach ($otherMarakiz as $m) {
            Location::updateOrCreate(
                ['parent_id' => $gov->id, 'slug' => $m['slug']],
                [
                    'type' => LocationType::Markaz,
                    'name_ar' => $m['name_ar'],
                    'name_en' => $m['name_en'],
                    'sort_order' => $m['sort_order'],
                    'is_active' => true,
                ]
            );
        }
    }
}
