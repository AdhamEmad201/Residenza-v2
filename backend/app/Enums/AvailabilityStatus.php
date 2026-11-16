<?php

declare(strict_types=1);

namespace App\Enums;

enum AvailabilityStatus: string
{
    case Available = 'available';
    case Sold = 'sold';
    case Rented = 'rented';
    case Hidden = 'hidden';
}
