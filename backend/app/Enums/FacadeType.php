<?php

declare(strict_types=1);

namespace App\Enums;

enum FacadeType: string
{
    case Northern = 'northern';
    case Southern = 'southern';
    case Eastern = 'eastern';
    case Western = 'western';
    case Corner = 'corner';
    case TwoStreets = 'two_streets';
    case MainStreet = 'main_street';
    case NileView = 'nile_view';

    public function labelAr(): string
    {
        return match ($this) {
            self::Northern => 'بحري',
            self::Southern => 'قبلي',
            self::Eastern => 'شرقي',
            self::Western => 'غربي',
            self::Corner => 'ناصية',
            self::TwoStreets => 'على شارعين',
            self::MainStreet => 'شارع رئيسي',
            self::NileView => 'إطلالة على النيل',
        };
    }
}

