<?php

declare(strict_types=1);

namespace App\Enums;

enum LegalStatus: string
{
    case RegisteredShahrAqari = 'registered_shahr_aqari';
    case SehaTawqee = 'seha_tawqee';
    case AllocationDecision = 'allocation_decision';
    case InitialContract = 'initial_contract';
    case InheritanceDeed = 'inheritance_deed';
    case Other = 'other';

    public function labelAr(): string
    {
        return match ($this) {
            self::RegisteredShahrAqari => 'مسجل شهر عقاري',
            self::SehaTawqee => 'صحة توقيع ونفاذ',
            self::AllocationDecision => 'قرار تخصيص (هيئة المجتمعات العمرانية)',
            self::InitialContract => 'عقد ابتدائي عرفي',
            self::InheritanceDeed => 'إعلام وراثة',
            self::Other => 'أخرى / تحت التسجيل',
        };
    }
}

