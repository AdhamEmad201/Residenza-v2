<?php

declare(strict_types=1);

namespace App\Modules\Property\Models;

use App\Enums\AvailabilityStatus;
use App\Enums\FacadeType;
use App\Enums\FinishingType;
use App\Enums\LegalStatus;
use App\Enums\ModerationStatus;
use App\Enums\PaymentMethod;
use App\Enums\RentalPeriod;
use App\Enums\TransactionType;
use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use App\Modules\Media\Models\PropertyDocument;
use App\Modules\Media\Models\PropertyImage;
use App\Modules\Moderation\Models\ModerationLog;
use App\Modules\Property\Policies\PropertyPolicy;
use App\Modules\Property\Services\ReferenceCodeGenerator;
use App\Modules\Taxonomy\Models\Category;
use App\Modules\Taxonomy\Models\Location;
use Carbon\Carbon;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\Attributes\UsePolicy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use InvalidArgumentException;
use LogicException;

#[UsePolicy(PropertyPolicy::class)]
class Property extends Model
{
    use HasFactory, SoftDeletes;

    public const MATERIAL_EDIT_FIELDS = [
        'category_id',
        'location_id',
        'transaction_type',
        'payment_method',
        'rental_period',
        'price_egp',
        'installment_price_egp',
        'down_payment_egp',
        'installment_period_months',
        'insurance_deposit_egp',
        'title_ar',
        'description_ar',
        'area_sqm',
        'bedrooms',
        'bathrooms',
        'floor_level',
        'total_floors',
        'finishing_type',
        'building_year',
        'street_width_meters',
        'facade_type',
        'declared_legal_status',
        'has_elevator',
        'has_electricity_meter',
        'has_water_meter',
        'has_natural_gas',
        'address_details_ar',
        'contact_phone',
        'contact_whatsapp',
    ];

    protected $fillable = [
        'reference_code',
        'slug',
        'category_id',
        'location_id',
        'transaction_type',
        'payment_method',
        'rental_period',
        'price_egp',
        'installment_price_egp',
        'down_payment_egp',
        'installment_period_months',
        'insurance_deposit_egp',
        'title_ar',
        'description_ar',
        'area_sqm',
        'bedrooms',
        'bathrooms',
        'floor_level',
        'total_floors',
        'finishing_type',
        'building_year',
        'street_width_meters',
        'facade_type',
        'declared_legal_status',
        'has_elevator',
        'has_electricity_meter',
        'has_water_meter',
        'has_natural_gas',
        'address_details_ar',
        'contact_phone',
        'contact_whatsapp',
        'availability_status',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'transaction_type' => TransactionType::class,
            'payment_method' => PaymentMethod::class,
            'rental_period' => RentalPeriod::class,
            'facade_type' => FacadeType::class,
            'declared_legal_status' => LegalStatus::class,
            'moderation_status' => ModerationStatus::class,
            'availability_status' => AvailabilityStatus::class,
            'finishing_type' => FinishingType::class,
            'price_egp' => 'decimal:2',
            'installment_price_egp' => 'decimal:2',
            'down_payment_egp' => 'decimal:2',
            'insurance_deposit_egp' => 'decimal:2',
            'area_sqm' => 'decimal:2',
            'street_width_meters' => 'decimal:2',
            'bedrooms' => 'integer',
            'bathrooms' => 'integer',
            'floor_level' => 'integer',
            'total_floors' => 'integer',
            'building_year' => 'integer',
            'installment_period_months' => 'integer',
            'has_elevator' => 'boolean',
            'has_electricity_meter' => 'boolean',
            'has_water_meter' => 'boolean',
            'has_natural_gas' => 'boolean',
            'is_featured' => 'boolean',
            'reviewed_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Property $property) {
            // Immutable reference_code guard
            if ($property->exists && $property->isDirty('reference_code')) {
                throw new LogicException('Property reference_code is immutable once assigned.');
            }

            // Price and area validations
            if ($property->price_egp === null || (float) $property->price_egp <= 0) {
                throw new InvalidArgumentException('Property price_egp must be greater than zero.');
            }

            if ($property->area_sqm === null || (float) $property->area_sqm <= 0) {
                throw new InvalidArgumentException('Property area_sqm must be greater than zero.');
            }

            $txType = $property->transaction_type instanceof TransactionType ? $property->transaction_type->value : (string) $property->transaction_type;

            if ($txType === TransactionType::Sale->value) {
                if ($property->payment_method === null) {
                    throw new InvalidArgumentException('Sale properties require a valid payment_method.');
                }

                $pm = $property->payment_method instanceof PaymentMethod ? $property->payment_method->value : (string) $property->payment_method;

                if ($property->rental_period !== null || $property->insurance_deposit_egp !== null) {
                    throw new InvalidArgumentException('Sale properties cannot have rental_period or insurance_deposit_egp.');
                }

                if ($pm === PaymentMethod::Cash->value) {
                    if ($property->installment_price_egp !== null || $property->down_payment_egp !== null || $property->installment_period_months !== null) {
                        throw new InvalidArgumentException('Cash sale properties cannot have installment_price_egp, down_payment_egp, or installment_period_months.');
                    }
                } elseif ($pm === PaymentMethod::Installment->value) {
                    if ($property->installment_price_egp !== null) {
                        throw new InvalidArgumentException('Installment-only sale properties cannot set installment_price_egp separately from price_egp.');
                    }

                    if ($property->installment_period_months === null || (int) $property->installment_period_months < 1 || (int) $property->installment_period_months > 360) {
                        throw new InvalidArgumentException('Installment sale properties require installment_period_months between 1 and 360.');
                    }

                    // OD-05: NULL and 0.00 allowed; positive values must be strictly < price_egp
                    if ($property->down_payment_egp !== null) {
                        $dp = (float) $property->down_payment_egp;
                        $price = (float) $property->price_egp;
                        if ($dp < 0 || $dp >= $price) {
                            throw new InvalidArgumentException('Down payment must be non-negative and strictly less than price_egp (OD-05).');
                        }
                    }
                } elseif ($pm === PaymentMethod::CashOrInstallment->value) {
                    // UD-02 = B: Separate installment_price_egp required (> 0)
                    if ($property->installment_price_egp === null || (float) $property->installment_price_egp <= 0) {
                        throw new InvalidArgumentException('Cash-or-installment sale properties require installment_price_egp greater than zero (UD-02).');
                    }

                    if ($property->installment_period_months !== null) {
                        $months = (int) $property->installment_period_months;
                        if ($months < 1 || $months > 360) {
                            throw new InvalidArgumentException('Installment period months must be between 1 and 360.');
                        }
                    }

                    // OD-05 + UD-02 = B: NULL and 0.00 allowed; positive values must be strictly < installment_price_egp
                    if ($property->down_payment_egp !== null) {
                        $dp = (float) $property->down_payment_egp;
                        $instPrice = (float) $property->installment_price_egp;
                        if ($dp < 0 || $dp >= $instPrice) {
                            throw new InvalidArgumentException('Down payment must be non-negative and strictly less than installment_price_egp (OD-05 / UD-02).');
                        }
                    }
                }
            } elseif ($txType === TransactionType::Rent->value) {
                if ($property->rental_period === null) {
                    throw new InvalidArgumentException('Rent properties require a valid rental_period.');
                }

                if ($property->payment_method !== null || $property->installment_price_egp !== null || $property->down_payment_egp !== null || $property->installment_period_months !== null) {
                    throw new InvalidArgumentException('Rent properties cannot specify payment_method, installment_price_egp, down_payment_egp, or installment_period_months.');
                }

                if ($property->insurance_deposit_egp !== null && (float) $property->insurance_deposit_egp < 0) {
                    throw new InvalidArgumentException('Insurance deposit cannot be negative.');
                }
            }

            // Physical and building constraints
            if ($property->floor_level !== null && $property->total_floors !== null) {
                if ((int) $property->floor_level > (int) $property->total_floors) {
                    throw new InvalidArgumentException('floor_level cannot be greater than total_floors.');
                }
            }

            if ($property->total_floors !== null && ((int) $property->total_floors < 1 || (int) $property->total_floors > 100)) {
                throw new InvalidArgumentException('total_floors must be between 1 and 100.');
            }

            if ($property->street_width_meters !== null) {
                $sw = (float) $property->street_width_meters;
                if ($sw < 1.00 || $sw > 100.00) {
                    throw new InvalidArgumentException('street_width_meters must be between 1.00 and 100.00.');
                }
            }

            if ($property->building_year !== null) {
                $year = (int) $property->building_year;
                $maxYear = Carbon::now('Africa/Cairo')->year + 5;
                if ($year < 1800 || $year > $maxYear) {
                    throw new InvalidArgumentException("building_year must be between 1800 and {$maxYear}.");
                }
            }
        });
    }

    /* -------------------------------------------------------------------------- */
    /* Creation & Lifecycle Transition Paths (T1 - T9)                            */
    /* -------------------------------------------------------------------------- */

    /**
     * T1: Save initial draft listing.
     */
    public static function createDraft(array $attributes, User $owner): self
    {
        if ($owner->status !== UserStatus::Active) {
            throw new AuthorizationException('User account is suspended.');
        }

        return ReferenceCodeGenerator::executeCreationTransaction(function () use ($attributes, $owner) {
            $generator = new ReferenceCodeGenerator();
            $code = $generator->generate();

            $property = new self();
            $property->fill($attributes);
            $property->reference_code = $code;
            $property->slug = $attributes['slug'] ?? (Str::slug($attributes['title_ar'] ?? 'property') . '-' . strtolower($code));
            $property->user_id = $owner->id;
            $property->moderation_status = ModerationStatus::Draft;
            $property->availability_status = $attributes['availability_status'] ?? AvailabilityStatus::Available;
            $property->reviewed_by = null;
            $property->reviewed_at = null;
            $property->published_at = null;
            $property->rejection_reason = null;
            $property->is_featured = false;
            $property->save();

            return $property;
        });
    }

    /**
     * T2-A: Direct property submission without prior draft.
     */
    public static function submitNew(array $attributes, User $owner, ?string $notes = null): self
    {
        if ($owner->status !== UserStatus::Active) {
            throw new AuthorizationException('User account is suspended.');
        }

        return ReferenceCodeGenerator::executeCreationTransaction(function () use ($attributes, $owner, $notes) {
            $generator = new ReferenceCodeGenerator();
            $code = $generator->generate();

            $property = new self();
            $property->fill($attributes);
            $property->reference_code = $code;
            $property->slug = $attributes['slug'] ?? (Str::slug($attributes['title_ar'] ?? 'property') . '-' . strtolower($code));
            $property->user_id = $owner->id;
            $property->moderation_status = ModerationStatus::PendingReview;
            $property->availability_status = $attributes['availability_status'] ?? AvailabilityStatus::Available;
            $property->reviewed_by = null;
            $property->reviewed_at = null;
            $property->published_at = null;
            $property->rejection_reason = null;
            $property->is_featured = false;
            $property->save();

            $property->moderationLogs()->create([
                'actor_id' => $owner->id,
                'from_status' => null,
                'to_status' => ModerationStatus::PendingReview->value,
                'action' => 'submit',
                'notes' => $notes,
            ]);

            return $property;
        });
    }

    /**
     * T2-B: Submit existing draft listing.
     */
    public function submitDraft(User $owner, ?string $notes = null): self
    {
        if ($owner->status !== UserStatus::Active || (int) $this->user_id !== (int) $owner->id) {
            throw new AuthorizationException('Unauthorized to submit this listing.');
        }

        if ($this->moderation_status !== ModerationStatus::Draft) {
            throw new InvalidArgumentException('Only draft properties can be submitted via submitDraft.');
        }

        return DB::transaction(function () use ($owner, $notes) {
            $this->moderation_status = ModerationStatus::PendingReview;
            $this->reviewed_by = null;
            $this->reviewed_at = null;
            $this->published_at = null;
            $this->rejection_reason = null;
            $this->save();

            $this->moderationLogs()->create([
                'actor_id' => $owner->id,
                'from_status' => ModerationStatus::Draft->value,
                'to_status' => ModerationStatus::PendingReview->value,
                'action' => 'submit',
                'notes' => $notes,
            ]);

            return $this;
        });
    }

    /**
     * T3: Admin direct publish (OD-01).
     * Unconditional published_at = now(), atomic admin_direct_publish log.
     */
    public static function createAdminPublished(array $attributes, User $admin, ?string $notes = null): self
    {
        if ($admin->status !== UserStatus::Active || $admin->role !== UserRole::Admin) {
            throw new AuthorizationException('Only active administrators can publish directly (OD-01).');
        }

        return ReferenceCodeGenerator::executeCreationTransaction(function () use ($attributes, $admin, $notes) {
            $generator = new ReferenceCodeGenerator();
            $code = $generator->generate();

            $now = Carbon::now();
            $property = new self();
            $property->fill($attributes);
            $property->reference_code = $code;
            $property->slug = $attributes['slug'] ?? (Str::slug($attributes['title_ar'] ?? 'property') . '-' . strtolower($code));
            $property->user_id = $attributes['user_id'] ?? $admin->id;
            $property->moderation_status = ModerationStatus::Approved;
            $property->availability_status = $attributes['availability_status'] ?? AvailabilityStatus::Available;
            $property->reviewed_by = $admin->id;
            $property->reviewed_at = $now;
            $property->published_at = $now; // Unconditionally now() per OD-01
            $property->rejection_reason = null;
            $property->is_featured = (bool) ($attributes['is_featured'] ?? false);
            $property->save();

            $property->moderationLogs()->create([
                'actor_id' => $admin->id,
                'from_status' => null,
                'to_status' => ModerationStatus::Approved->value,
                'action' => 'admin_direct_publish',
                'notes' => $notes ?? 'نشر مباشر بواسطة إدارة المنصة',
            ]);

            return $property;
        });
    }

    /**
     * T4: Admin approve user submission.
     */
    public function approve(User $admin, ?string $notes = null, ?Carbon $scheduledAt = null): self
    {
        if ($admin->status !== UserStatus::Active || $admin->role !== UserRole::Admin || (int) $admin->id === (int) $this->user_id) {
            throw new AuthorizationException('Admins cannot approve their own listings; must be active admin.');
        }

        if ($this->moderation_status !== ModerationStatus::PendingReview) {
            throw new InvalidArgumentException('Only pending_review listings can be approved.');
        }

        return DB::transaction(function () use ($admin, $notes, $scheduledAt) {
            $oldStatus = $this->moderation_status->value;
            $this->moderation_status = ModerationStatus::Approved;
            $this->reviewed_by = $admin->id;
            $this->reviewed_at = Carbon::now();
            $this->published_at = $scheduledAt ?? Carbon::now();
            $this->rejection_reason = null;
            $this->save();

            $this->moderationLogs()->create([
                'actor_id' => $admin->id,
                'from_status' => $oldStatus,
                'to_status' => ModerationStatus::Approved->value,
                'action' => 'approve',
                'notes' => $notes,
            ]);

            return $this;
        });
    }

    /**
     * T5: Admin request changes.
     */
    public function requestChanges(User $admin, string $reason): self
    {
        if ($admin->status !== UserStatus::Active || $admin->role !== UserRole::Admin) {
            throw new AuthorizationException('Only active administrators can request changes.');
        }

        if (trim($reason) === '') {
            throw new InvalidArgumentException('A reason notes message is mandatory when requesting changes.');
        }

        if ($this->moderation_status !== ModerationStatus::PendingReview) {
            throw new InvalidArgumentException('Only pending_review listings can receive change requests.');
        }

        return DB::transaction(function () use ($admin, $reason) {
            $oldStatus = $this->moderation_status->value;
            $this->moderation_status = ModerationStatus::ChangesRequested;
            $this->reviewed_by = $admin->id;
            $this->reviewed_at = Carbon::now();
            $this->rejection_reason = $reason;
            $this->published_at = null;
            $this->save();

            $this->moderationLogs()->create([
                'actor_id' => $admin->id,
                'from_status' => $oldStatus,
                'to_status' => ModerationStatus::ChangesRequested->value,
                'action' => 'request_changes',
                'notes' => $reason,
            ]);

            return $this;
        });
    }

    /**
     * T6: Admin reject / revoke listing.
     */
    public function reject(User $admin, string $reason): self
    {
        if ($admin->status !== UserStatus::Active || $admin->role !== UserRole::Admin) {
            throw new AuthorizationException('Only active administrators can reject listings.');
        }

        if (trim($reason) === '') {
            throw new InvalidArgumentException('A rejection reason is mandatory when rejecting a listing.');
        }

        $allowedFrom = [ModerationStatus::PendingReview, ModerationStatus::ChangesRequested, ModerationStatus::Approved];
        if (!in_array($this->moderation_status, $allowedFrom, true)) {
            throw new InvalidArgumentException('Invalid moderation status for rejection.');
        }

        return DB::transaction(function () use ($admin, $reason) {
            $oldStatus = $this->moderation_status->value;
            $this->moderation_status = ModerationStatus::Rejected;
            $this->reviewed_by = $admin->id;
            $this->reviewed_at = Carbon::now();
            $this->rejection_reason = $reason;
            $this->published_at = null;
            $this->save();

            $this->moderationLogs()->create([
                'actor_id' => $admin->id,
                'from_status' => $oldStatus,
                'to_status' => ModerationStatus::Rejected->value,
                'action' => 'reject',
                'notes' => $reason,
            ]);

            return $this;
        });
    }

    /**
     * T7: Owner edit on approved listing -> automatic reset to pending_review.
     */
    public function updateByOwner(array $attributes, User $owner): self
    {
        if ($owner->status !== UserStatus::Active || (int) $this->user_id !== (int) $owner->id || $owner->role === UserRole::Admin) {
            throw new AuthorizationException('Unauthorized owner update.');
        }

        return DB::transaction(function () use ($attributes, $owner) {
            $wasApproved = $this->moderation_status === ModerationStatus::Approved;

            $this->fill($attributes);

            $hasMaterialChanges = $this->isDirty(self::MATERIAL_EDIT_FIELDS);
            $shouldResetModeration = $wasApproved && $hasMaterialChanges;

            if ($shouldResetModeration) {
                $this->moderation_status = ModerationStatus::PendingReview;
                $this->published_at = null;
                $this->reviewed_by = null;
                $this->reviewed_at = null;
                $this->rejection_reason = null;
            }

            $this->save();

            if ($shouldResetModeration) {
                $this->moderationLogs()->create([
                    'actor_id' => $owner->id,
                    'from_status' => ModerationStatus::Approved->value,
                    'to_status' => ModerationStatus::PendingReview->value,
                    'action' => 'edit_reset',
                    'notes' => 'إعادة للمراجعة تلقائياً بعد تعديل بيانات العقار',
                ]);
            }

            return $this;
        });
    }

    /**
     * T7 (Media): Reset approved listing to pending_review after public image addition/deletion.
     */
    public function resetModerationForMediaEdit(User $owner, string $notes = 'إعادة للمراجعة تلقائياً بعد تعديل صور العقار'): self
    {
        if ($owner->status !== UserStatus::Active || (int) $this->user_id !== (int) $owner->id || $owner->role === UserRole::Admin) {
            throw new AuthorizationException('Unauthorized owner media edit.');
        }

        if ($this->moderation_status !== ModerationStatus::Approved) {
            return $this;
        }

        return DB::transaction(function () use ($owner, $notes) {
            $this->moderation_status = ModerationStatus::PendingReview;
            $this->published_at = null;
            $this->reviewed_by = null;
            $this->reviewed_at = null;
            $this->rejection_reason = null;
            $this->save();

            $this->moderationLogs()->create([
                'actor_id' => $owner->id,
                'from_status' => ModerationStatus::Approved->value,
                'to_status' => ModerationStatus::PendingReview->value,
                'action' => 'edit_reset',
                'notes' => $notes,
            ]);

            return $this;
        });
    }

    /**
     * T8: Owner resubmit listing after changes requested or rejection.
     * Clears reviewed_by, reviewed_at, published_at, rejection_reason to NULL.
     */
    public function resubmit(User $owner, ?string $notes = null): self
    {
        if ($owner->status !== UserStatus::Active || (int) $this->user_id !== (int) $owner->id) {
            throw new AuthorizationException('Unauthorized owner resubmit.');
        }

        $allowedFrom = [ModerationStatus::ChangesRequested, ModerationStatus::Rejected];
        if (!in_array($this->moderation_status, $allowedFrom, true)) {
            throw new InvalidArgumentException('Only listings with changes_requested or rejected status can be resubmitted.');
        }

        return DB::transaction(function () use ($owner, $notes) {
            $oldStatus = $this->moderation_status->value;

            $this->moderation_status = ModerationStatus::PendingReview;
            $this->reviewed_by = null;
            $this->reviewed_at = null;
            $this->published_at = null;
            $this->rejection_reason = null;
            $this->save();

            $this->moderationLogs()->create([
                'actor_id' => $owner->id,
                'from_status' => $oldStatus,
                'to_status' => ModerationStatus::PendingReview->value,
                'action' => 'resubmit',
                'notes' => $notes,
            ]);

            return $this;
        });
    }

    /**
     * T9: Toggle availability status.
     */
    public function setAvailability(AvailabilityStatus $status, User $actor): self
    {
        $isOwner = (int) $this->user_id === (int) $actor->id;
        $isAdmin = $actor->role === UserRole::Admin;

        if ($actor->status !== UserStatus::Active || (!$isOwner && !$isAdmin)) {
            throw new AuthorizationException('Unauthorized to change availability.');
        }

        $this->availability_status = $status;
        $this->save();

        return $this;
    }

    /* -------------------------------------------------------------------------- */
    /* Scopes & Query Helpers                                                     */
    /* -------------------------------------------------------------------------- */

    /**
     * Scope to public marketplace listings adhering strictly to the visibility predicate.
     */
    public function scopePublicMarketplace(Builder $query): Builder
    {
        return $query->where('moderation_status', ModerationStatus::Approved->value)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', Carbon::now())
            ->where('availability_status', AvailabilityStatus::Available->value)
            ->whereNull('deleted_at')
            ->whereHas('user', function (Builder $u) {
                $u->where('status', UserStatus::Active->value);
            });
    }

    /* -------------------------------------------------------------------------- */
    /* Relationships                                                              */
    /* -------------------------------------------------------------------------- */

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'location_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function images(): HasMany
    {
        return $this->hasMany(PropertyImage::class, 'property_id')->orderBy('sort_order');
    }

    public function primaryImage(): HasOne
    {
        return $this->hasOne(PropertyImage::class, 'property_id')->where('is_primary', true);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(PropertyDocument::class, 'property_id');
    }

    public function moderationLogs(): HasMany
    {
        return $this->hasMany(ModerationLog::class, 'property_id')->latest('created_at');
    }
}
