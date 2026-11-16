<?php

declare(strict_types=1);

namespace App\Modules\Property\Services;

use Carbon\Carbon;
use Illuminate\Contracts\Database\ConcurrencyErrorDetector;
use Illuminate\Support\Facades\DB;
use PDOException;
use Throwable;

class ReferenceCodeGenerator
{
    public const MAX_SEQUENCE = 999999999999;

    /**
     * Allocate the next atomic reference code for the given year.
     * Must be called inside an active database transaction.
     *
     * @throws \LogicException If called outside an active transaction.
     * @throws \OverflowException If sequence exceeds MAX_SEQUENCE.
     */
    public function generate(?int $year = null): string
    {
        if (DB::transactionLevel() === 0) {
            throw new \LogicException('ReferenceCodeGenerator::generate() must be called inside an active database transaction.');
        }

        $targetYear = $year ?? Carbon::now('Africa/Cairo')->year;
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            $row = DB::selectOne(
                'INSERT INTO reference_sequences (year, current_sequence, updated_at)
                 VALUES (?, 1, CURRENT_TIMESTAMP)
                 ON CONFLICT (year) DO UPDATE
                 SET current_sequence = reference_sequences.current_sequence + 1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE reference_sequences.current_sequence < ?
                 RETURNING current_sequence',
                [$targetYear, self::MAX_SEQUENCE]
            );

            if ($row === null) {
                throw new \OverflowException("Reference sequence exceeded maximum supported bound (" . self::MAX_SEQUENCE . ") for year {$targetYear}.");
            }

            $sequence = (int) $row->current_sequence;
        } else {
            // SQLite and other drivers
            $affected = DB::affectingStatement(
                'INSERT INTO reference_sequences (year, current_sequence, updated_at)
                 VALUES (?, 1, CURRENT_TIMESTAMP)
                 ON CONFLICT (year) DO UPDATE
                 SET current_sequence = reference_sequences.current_sequence + 1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE reference_sequences.current_sequence < ?',
                [$targetYear, self::MAX_SEQUENCE]
            );

            if ($affected === 0) {
                throw new \OverflowException("Reference sequence exceeded maximum supported bound (" . self::MAX_SEQUENCE . ") for year {$targetYear}.");
            }

            $sequence = (int) DB::table('reference_sequences')
                ->where('year', $targetYear)
                ->value('current_sequence');
        }

        return sprintf('RES-%04d-%05d', $targetYear, $sequence);
    }

    /**
     * Execute an operation inside a creation transaction with bounded concurrency retry on SQLite.
     * Outer caller transactions are respected (no nested retries, never unwinding outer caller state).
     */
    public static function executeCreationTransaction(\Closure $operation, int $maxAttempts = 5): mixed
    {
        $connection = DB::connection();
        $initialLevel = $connection->transactionLevel();

        // If already inside an outer caller transaction, execute directly in savepoint without retry
        if ($initialLevel > 0) {
            return $connection->transaction(fn () => $operation(), attempts: 1);
        }

        $isSqlite = $connection->getDriverName() === 'sqlite';

        if ($isSqlite) {
            $connection->statement('PRAGMA busy_timeout = 5000;');
        }

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            try {
                return $connection->transaction(fn () => $operation(), attempts: 1);
            } catch (Throwable $e) {
                // Ensure coordinator's own transaction has fully unwound to level 0 before retrying
                while ($connection->transactionLevel() > 0) {
                    $connection->rollBack();
                }

                $isConcurrencyError = self::isRetryableConcurrencyError($e);

                if ($isConcurrencyError && $attempt < $maxAttempts && $connection->transactionLevel() === 0) {
                    // Bounded randomized jitter: 10ms to 50ms with maximum 5 attempts
                    usleep(random_int(10000, 50000));
                    continue;
                }

                // Non-concurrency errors (Validation, OverflowException, CHECK failure) throw immediately
                throw $e;
            }
        }

        throw new \RuntimeException('Failed to execute property creation transaction after maximum retry attempts.');
    }

    /**
     * Driver-aware classification of concurrency/lock errors, traversing full exception chain.
     */
    public static function isRetryableConcurrencyError(Throwable $e): bool
    {
        // 1. Implementation-time verification requirement: inspect installed Laravel detector
        if (app()->bound(ConcurrencyErrorDetector::class)) {
            $detector = app(ConcurrencyErrorDetector::class);
            if ($detector->causedByConcurrencyError($e)) {
                return true;
            }
        }

        // 2. Traverse complete exception chain
        $cursor = $e;
        while ($cursor !== null) {
            $msg = strtolower($cursor->getMessage());
            if (str_contains($msg, 'database is locked') ||
                str_contains($msg, 'database table is locked') ||
                str_contains($msg, 'the database file is locked') ||
                str_contains($msg, 'sqlite_busy') ||
                str_contains($msg, 'sqlite_locked')) {
                return true;
            }

            if ($cursor instanceof PDOException) {
                // Inspect driver-specific errorInfo[1] (SQLite extended error codes)
                // 5 = SQLITE_BUSY, 6 = SQLITE_LOCKED, 261 = SQLITE_BUSY_RECOVERY, 517 = SQLITE_BUSY_SNAPSHOT
                if (isset($cursor->errorInfo[1]) && in_array((int) $cursor->errorInfo[1], [5, 6, 261, 517], true)) {
                    return true;
                }

                // SQLSTATE 40001 (serialization failure / deadlock)
                if ($cursor->getCode() === 40001 || $cursor->getCode() === '40001') {
                    return true;
                }
            }

            $cursor = $cursor->getPrevious();
        }

        return false;
    }
}

