<?php

namespace App\Support;

use App\Models\User;

/**
 * Jangkauan data efektif seorang pengguna.
 *
 * Jangkauan melekat pada penetapan peran, bukan pada perannya. Satu orang dapat
 * memegang beberapa penetapan sekaligus; yang berlaku adalah tingkat tertinggi,
 * dan penetapan tingkat Departemen menumpuk menjadi himpunan departemen.
 *
 * ATURAN YANG MUDAH SALAH DIBACA: "jangkauan mencakup satu departemen"
 * merentang dua tabel dan artinya memang berbeda.
 *
 *   - Untuk laporan  : `daily_reports.department_id` — nilai yang disalin saat
 *                      laporan dibuat dan tidak pernah ikut berpindah.
 *   - Untuk orang    : `users.department_id` — nilai sekarang.
 *
 * Laporan tetap berada di tempat ia diarsipkan, orangnya tidak. Perbedaan itu
 * disengaja; jangan "diperbaiki" menjadi seragam.
 */
final readonly class JangkauanData
{
    /** Hanya data milik sendiri. */
    public const PERSONAL = 1;

    /** Data satu atau beberapa departemen. */
    public const DEPARTEMEN = 2;

    /** Seluruh data, lintas departemen. */
    public const KORPORAT = 3;

    /**
     * @param  list<int>  $departemenId  Terisi hanya pada tingkat Departemen.
     */
    private function __construct(
        public int $level,
        public array $departemenId,
        public int $penggunaId,
    ) {}

    public static function untuk(User $pengguna): self
    {
        $penetapan = $pengguna->roles->map(fn ($peran) => [
            'scope_level' => (int) $peran->pivot->scope_level,
            'department_id' => $peran->pivot->department_id === null
                ? null
                : (int) $peran->pivot->department_id,
        ])->all();

        return self::dariPenetapan($penetapan, $pengguna->department_id, (int) $pengguna->getKey());
    }

    /**
     * Aturannya sendiri, tanpa basis data.
     *
     * Dipisahkan supaya "tertinggi menang" dan "menumpuk" dapat diuji tanpa
     * menyiapkan pengguna, peran, dan pivot lebih dulu.
     *
     * @param  array<int, array{scope_level: int, department_id: int|null}>  $penetapan
     */
    public static function dariPenetapan(
        array $penetapan,
        ?int $departemenPengguna,
        int $penggunaId,
    ): self {
        // Tanpa penetapan sama sekali: Personal. Deny by default — bukan
        // "belum diatur berarti semuanya".
        $level = self::PERSONAL;

        foreach ($penetapan as $satu) {
            $level = max($level, (int) $satu['scope_level']);
        }

        if ($level !== self::DEPARTEMEN) {
            return new self($level, [], $penggunaId);
        }

        $departemen = [];

        foreach ($penetapan as $satu) {
            if ((int) $satu['scope_level'] !== self::DEPARTEMEN) {
                continue;
            }

            // department_id kosong berarti "mengikuti departemen pengguna".
            $id = $satu['department_id'] ?? $departemenPengguna;

            if ($id !== null) {
                $departemen[] = (int) $id;
            }
        }

        $departemen = array_values(array_unique($departemen));
        sort($departemen);

        return new self(self::DEPARTEMEN, $departemen, $penggunaId);
    }

    public function korporat(): bool
    {
        return $this->level === self::KORPORAT;
    }

    public function personal(): bool
    {
        return $this->level === self::PERSONAL;
    }

    /**
     * Apakah satu departemen berada di dalam jangkauan.
     */
    public function mencakupDepartemen(?int $departemenId): bool
    {
        if ($this->korporat()) {
            return true;
        }

        if ($departemenId === null) {
            return false;
        }

        return in_array($departemenId, $this->departemenId, true);
    }

    /**
     * Apakah seorang pengguna berada di dalam jangkauan.
     *
     * Dirinya sendiri selalu tercakup, berapa pun tingkatnya.
     */
    public function mencakupPengguna(User $lain): bool
    {
        if ((int) $lain->getKey() === $this->penggunaId) {
            return true;
        }

        return $this->mencakupDepartemen(
            $lain->department_id === null ? null : (int) $lain->department_id,
        );
    }

    /** Label siap tampil. Angka tingkat tidak boleh menjadi label layar. */
    public function label(): string
    {
        return match ($this->level) {
            self::KORPORAT => 'Korporat',
            self::DEPARTEMEN => 'Departemen',
            default => 'Pribadi',
        };
    }
}
