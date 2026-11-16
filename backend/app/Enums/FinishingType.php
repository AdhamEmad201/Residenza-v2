<?php

declare(strict_types=1);

namespace App\Enums;

enum FinishingType: string
{
    case CoreAndShell = 'core_and_shell';
    case SemiFinished = 'semi_finished';
    case FullyFinished = 'fully_finished';
    case Lux = 'lux';
    case SuperLux = 'super_lux';
}
