<?php

declare(strict_types=1);

namespace App\Enums;

enum LocationType: string
{
    case Governorate = 'governorate';
    case Markaz = 'markaz';
    case City = 'city';
    case District = 'district';
    case Village = 'village';

    public function labelAr(): string
    {
        return match ($this) {
            self::Governorate => 'محافظة',
            self::Markaz => 'مركز إداري',
            self::City => 'مدينة',
            self::District => 'حي / منطقة',
            self::Village => 'قرية',
        };
    }
}

