<?php

declare(strict_types=1);

namespace App\Enums;

enum AccountType: string
{
    case Individual = 'individual';
    case Broker = 'broker';
    case Company = 'company';
    case Admin = 'admin';
}

