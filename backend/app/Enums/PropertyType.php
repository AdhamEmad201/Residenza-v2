<?php

declare(strict_types=1);

namespace App\Enums;

enum PropertyType: string
{
    case Residential = 'residential';
    case Commercial = 'commercial';
    case Administrative = 'administrative';
    case Land = 'land';

    public function labelAr(): string
    {
        return match ($this) {
            self::Residential => 'سكني',
            self::Commercial => 'تجاري',
            self::Administrative => 'إداري وطبي',
            self::Land => 'أراضي',
        };
    }
}

