<?php

declare(strict_types=1);

namespace App\Enums;

enum RentalPeriod: string
{
    case Monthly = 'monthly';
    case Quarterly = 'quarterly';
    case Yearly = 'yearly';
    case Daily = 'daily';

    public function labelAr(): string
    {
        return match ($this) {
            self::Monthly => 'شهري',
            self::Quarterly => 'ربع سنوي',
            self::Yearly => 'سنوي',
            self::Daily => 'يومي',
        };
    }
}

