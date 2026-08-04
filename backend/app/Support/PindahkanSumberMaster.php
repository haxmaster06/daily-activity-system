<?php

namespace App\Support;

use App\Models\MasterType;
use App\Models\TemplateField;

/**
 * Memindahkan `template_fields.lookup_source` ke `master_type_id`.
 *
 * `lookup_source` adalah string bebas berisi salah satu dari lima kunci mati
 * yang tidak pernah dibaca siapa pun. Nilainya sudah tersimpan pada baris yang
 * ada, dan itu satu-satunya petunjuk daftar mana yang dimaksudkan
 * administrator saat menyusun template.
 *
 * Dipisahkan dari migration supaya bagian paling berisiko di rilis ini dapat
 * diuji — pola yang sama dengan backfill RBAC.
 *
 * **`type` sengaja tidak diubah.** Kolom yang tadinya `text` tetap `text`.
 * Mengubahnya menjadi `master` secara diam-diam akan mengubah cara laporan
 * lama divalidasi: baris yang sudah tersimpan berisi string biasa, sedangkan
 * tipe `master` menuntut `{kode, nama}`. Administrator yang memutuskan kapan
 * kolomnya berpindah, lewat layar.
 */
final class PindahkanSumberMaster
{
    /**
     * @return array{dipindahkan: int, dilewati: int}
     */
    public static function jalankan(): array
    {
        $dipindahkan = 0;
        $dilewati = 0;

        $kolom = TemplateField::query()
            ->whereNotNull('lookup_source')
            ->whereNull('master_type_id')
            ->get();

        foreach ($kolom as $satu) {
            $jenis = MasterType::where('slug', $satu->lookup_source)->first();

            if ($jenis === null) {
                // Sumber yang tidak punya daftar padanan — mis. `pengguna`,
                // yang bukan daftar master melainkan tabel akun.
                $dilewati++;

                continue;
            }

            $satu->forceFill(['master_type_id' => $jenis->id])->save();
            $dipindahkan++;
        }

        return ['dipindahkan' => $dipindahkan, 'dilewati' => $dilewati];
    }
}
