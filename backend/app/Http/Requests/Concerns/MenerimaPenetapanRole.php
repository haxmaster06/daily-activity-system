<?php

namespace App\Http\Requests\Concerns;

use App\Models\Role;
use App\Support\JangkauanData;
use Illuminate\Validation\Validator;

/**
 * Aturan dan penerjemahan penetapan peran pada payload pengguna.
 *
 * Bentuk barunya berupa daftar penetapan, masing-masing membawa jangkauan
 * datanya sendiri:
 *
 *     "penetapan": [{ "role_id": 2, "scope_level": 2, "department_id": null }]
 *
 * `role_id` tunggal masih diterima sebagai bentuk lama supaya backend dan
 * frontend dapat dirilis terpisah. Bila yang datang `role_id`, satu penetapan
 * disusun dari jangkauan bawaan perannya.
 */
trait MenerimaPenetapanRole
{
    /** Batas wajar; lebih dari ini menandakan salah pakai, bukan kebutuhan. */
    private const MAKS_PENETAPAN = 5;

    /**
     * @return array<string, array<int, mixed>>
     */
    protected function aturanPenetapan(): array
    {
        return [
            'penetapan' => ['required_without:role_id', 'array', 'min:1', 'max:'.self::MAKS_PENETAPAN],
            'penetapan.*.role_id' => ['required', 'integer', 'exists:roles,id'],
            'penetapan.*.scope_level' => ['required', 'integer', 'in:1,2,3'],
            'penetapan.*.department_id' => ['nullable', 'integer', 'exists:departments,id'],

            // Bentuk lama, satu peran saja.
            'role_id' => ['required_without:penetapan', 'integer', 'exists:roles,id'],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function labelPenetapan(): array
    {
        return [
            'penetapan' => 'penetapan peran',
            'penetapan.*.role_id' => 'peran',
            'penetapan.*.scope_level' => 'jangkauan data',
            'penetapan.*.department_id' => 'departemen',
            'role_id' => 'peran',
        ];
    }

    /**
     * Departemen hanya bermakna pada jangkauan Departemen.
     *
     * Pada jangkauan Pribadi ia menjadi sumber kebenaran kedua di samping
     * departemen pengguna; pada Korporat ia tidak berarti apa-apa. Ditolak
     * di sini, bukan dibersihkan diam-diam, supaya kekeliruan pengisian
     * terlihat oleh yang mengisinya.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            foreach ((array) $this->input('penetapan', []) as $index => $satu) {
                $level = (int) ($satu['scope_level'] ?? 0);
                $departemen = $satu['department_id'] ?? null;

                if ($level !== JangkauanData::DEPARTEMEN && $departemen !== null) {
                    $validator->errors()->add(
                        "penetapan.{$index}.department_id",
                        'Departemen hanya diisi bila jangkauan datanya Departemen.',
                    );
                }
            }
        });
    }

    /**
     * Penetapan siap simpan.
     *
     * @return array<int, array{role_id: int, scope_level: int, department_id: int|null}>
     */
    public function penetapan(): array
    {
        $dikirim = $this->input('penetapan');

        if (is_array($dikirim) && $dikirim !== []) {
            return array_map(fn (array $satu) => [
                'role_id' => (int) $satu['role_id'],
                'scope_level' => (int) $satu['scope_level'],
                'department_id' => isset($satu['department_id'])
                    ? (int) $satu['department_id']
                    : null,
            ], array_values($dikirim));
        }

        $peran = Role::find($this->input('role_id'));

        if ($peran === null) {
            return [];
        }

        return [[
            'role_id' => (int) $peran->getKey(),
            'scope_level' => $peran->scope_level_default ?? match (true) {
                $peran->level >= Role::LEVEL_MANAGER => JangkauanData::KORPORAT,
                $peran->level >= Role::LEVEL_SUPERVISOR => JangkauanData::DEPARTEMEN,
                default => JangkauanData::PERSONAL,
            },
            // Kosong berarti mengikuti departemen pengguna — persis perilaku
            // sebelum penetapan peran ada.
            'department_id' => null,
        ]];
    }
}
