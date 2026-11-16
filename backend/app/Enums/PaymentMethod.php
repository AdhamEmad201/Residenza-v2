<?php

declare(strict_types=1);

namespace App\Enums;

enum PaymentMethod: string
{
    case Cash = 'cash';
    case Installment = 'installment';
    case CashOrInstallment = 'cash_or_installment';

    public function labelAr(): string
    {
        return match ($this) {
            self::Cash => 'كاش فقط',
            self::Installment => 'تقسيط فقط',
            self::CashOrInstallment => 'كاش أو تقسيط',
        };
    }
}

