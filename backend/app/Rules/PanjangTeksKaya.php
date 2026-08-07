<?php

namespace App\Rules;

use App\Support\HtmlAman;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Membatasi panjang isian teks kaya berdasarkan teksnya, bukan HTML-nya.
 *
 * `max:500` bawaan Laravel menghitung seluruh karakter yang dikirim — termasuk
 * `<ul>`, `<li>`, dan `</strong>`. Batas seperti itu tidak dapat dijelaskan
 * kepada pengguna: kalimat yang sama ditolak atau diterima tergantung apakah
 * sebagiannya ditebalkan, dan tidak ada satu pun petunjuk di layar yang
 * menjelaskan mengapa.
 *
 * Yang dihitung di sini adalah isi yang benar-benar diketik, sesudah tagnya
 * dilucuti. "Maksimal 500 karakter" karena itu berarti persis 500 karakter
 * yang terlihat.
 */
class PanjangTeksKaya implements ValidationRule
{
    public function __construct(private readonly int $maksimal) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return;
        }

        if (! is_string($value)) {
            $fail('Isian :attribute tidak dikenali.');

            return;
        }

        $panjang = mb_strlen(HtmlAman::keTeks($value));

        if ($panjang > $this->maksimal) {
            $fail("Isian :attribute maksimal {$this->maksimal} karakter, saat ini {$panjang}.");
        }
    }
}
