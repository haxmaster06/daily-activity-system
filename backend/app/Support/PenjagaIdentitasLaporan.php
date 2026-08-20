<?php

namespace App\Support;

use App\Models\ReportTemplate;
use App\Models\TemplateField;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Mencegah satu catatan produksi fisik tercatat dua kali oleh orang berbeda.
 *
 * Proses Produksi diisi banyak pelapor. Bila dua orang mencatat LOT yang sama
 * pada tanggal produksi yang sama, angka analitik menggelembung — dan sistem
 * tak bisa tahu keduanya kejadian fisik yang sama. Penjaga ini menutup celah
 * itu di titik simpan: kombinasi kolom identitas ditolak bila sudah ada di
 * laporan lain.
 *
 * ## Kolom identitas ditentukan otomatis
 *
 * Yaitu kolom yang **di luar stasiun** (`group_label` kosong), **tanpa satuan**
 * (`unit` kosong), dan **bukan teks panjang** — untuk PROD_PROSES: Tanggal
 * Produksi + LOT. Kolom pengukuran (kg, bag, box) selalu ber-satuan atau
 * ber-`group_label`, jadi tidak pernah ikut jadi penanda.
 *
 * ## Kenapa hanya sebagian template
 *
 * Diterapkan hanya pada template yang catatannya memang punya identitas fisik
 * unik (LOT). Template umum seperti Aktivitas Umum berpenanda "target + status"
 * yang wajar berulang antar orang — menjaganya justru menolak pekerjaan sah.
 */
final class PenjagaIdentitasLaporan
{
    /** Kode template yang dijaga. Menambah di sini memperluas cakupannya. */
    private const TEMPLATE_DIJAGA = ['PROD_PROSES'];

    /**
     * @return list<string>
     */
    public static function kolomIdentitas(ReportTemplate $template): array
    {
        return $template->fields
            ->filter(fn (TemplateField $f): bool => ($f->group_label === null || $f->group_label === '')
                && ($f->unit === null || $f->unit === '')
                && $f->type !== TemplateField::TIPE_TEXTAREA)
            ->pluck('key')
            ->values()
            ->all();
    }

    /**
     * @param  array<int, array<string, mixed>>  $items  baris yang sudah dibersihkan
     *
     * @throws ValidationException
     */
    public static function periksa(
        ReportTemplate $template,
        array $items,
        User $pengguna,
        ?int $laporanId,
        string $awalan,
    ): void {
        if (! in_array($template->code, self::TEMPLATE_DIJAGA, true)) {
            return;
        }

        $kolom = self::kolomIdentitas($template);

        if ($kolom === []) {
            return;
        }

        $sudahDiLaporanIni = [];

        foreach (array_values($items) as $i => $baris) {
            $identitas = self::identitas($kolom, (array) $baris);

            if ($identitas === null) {
                continue;
            }

            $tanda = implode('|', $identitas);

            if (isset($sudahDiLaporanIni[$tanda])) {
                throw ValidationException::withMessages([
                    "{$awalan}.{$i}" => self::pesan($template, $identitas, null),
                ]);
            }
            $sudahDiLaporanIni[$tanda] = true;

            $bentrok = self::cariBentrok($template->id, $identitas, $laporanId);

            if ($bentrok !== null) {
                throw ValidationException::withMessages([
                    "{$awalan}.{$i}" => self::pesan($template, $identitas, $bentrok->nama),
                ]);
            }
        }
    }

    /**
     * @param  list<string>  $kolom
     * @param  array<string, mixed>  $baris
     * @return array<string, string>|null Null bila identitasnya tak lengkap.
     */
    private static function identitas(array $kolom, array $baris): ?array
    {
        $hasil = [];

        foreach ($kolom as $k) {
            $nilai = $baris[$k] ?? null;

            // Identitas tak lengkap tak bisa jadi acuan dobel — lewati barisnya.
            if ($nilai === null || $nilai === '' || is_array($nilai)) {
                return null;
            }

            $hasil[$k] = (string) $nilai;
        }

        return $hasil === [] ? null : $hasil;
    }

    /**
     * @param  array<string, string>  $identitas
     */
    private static function cariBentrok(int $templateId, array $identitas, ?int $laporanId): ?object
    {
        $query = DB::table('daily_report_items as i')
            ->join('daily_report_sections as s', 's.id', '=', 'i.daily_report_section_id')
            ->join('daily_reports as r', 'r.id', '=', 's.daily_report_id')
            ->join('users as u', 'u.id', '=', 'r.user_id')
            ->where('s.report_template_id', $templateId);

        if ($laporanId !== null) {
            $query->where('r.id', '!=', $laporanId);
        }

        foreach ($identitas as $kunci => $nilai) {
            if (! preg_match('/^[a-z0-9_]+$/i', $kunci)) {
                return null;
            }

            $query->whereRaw('JSON_UNQUOTE(JSON_EXTRACT(i.data, ?)) = ?', ['$."'.$kunci.'"', $nilai]);
        }

        // ponytail: memindai JSON tanpa index; untuk PROD_PROSES volumenya kecil.
        // Bila tumbuh besar, tambah generated column + index pada kunci identitas.
        return $query->select('u.name as nama')->first();
    }

    /**
     * @param  array<string, string>  $identitas
     */
    private static function pesan(ReportTemplate $template, array $identitas, ?string $nama): string
    {
        $label = $template->fields->pluck('label', 'key');

        $ringkas = collect($identitas)
            ->map(fn (string $nilai, string $kunci): string => ($label[$kunci] ?? $kunci).' '.$nilai)
            ->join(' · ');

        if ($nama === null) {
            return "Baris dengan {$ringkas} muncul lebih dari sekali pada laporan ini.";
        }

        return "Kombinasi {$ringkas} sudah dicatat oleh {$nama}. "
            .'Satu catatan produksi tidak boleh dobel — gunakan kombinasi lain.';
    }
}
