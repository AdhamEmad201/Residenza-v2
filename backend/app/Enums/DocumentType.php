<?php

declare(strict_types=1);

namespace App\Enums;

enum DocumentType: string
{
    case OwnershipProof = 'ownership_proof';
    case BrokerAuthorization = 'broker_authorization';
    case NationalId = 'national_id';
    case Other = 'other';
}
