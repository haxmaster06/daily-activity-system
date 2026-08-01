<?php

namespace App\Rules;

use App\Models\Department;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Menolak departemen sistem sebagai pilihan.
 *
 * Departemen sistem hanya untuk akun administrator awal. Ia tidak muncul di
 * daftar pilihan, tetapi daftar pilihan bukan penjagaan — payload dapat
 * disusun sendiri.
 */
class BukanDepartemenSistem implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        $sistem = Department::whereKey($value)->value('is_system');

        if ($sistem) {
            $fail('Departemen tersebut khusus akun sistem dan tidak dapat dipilih.');
        }
    }
}
