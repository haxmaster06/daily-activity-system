<?php

namespace App\Support;

use App\Models\DailyReportItem;
use App\Models\ReportTemplate;
use App\Models\TemplateField;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * Menyusun dan menjalankan aturan validasi dari definisi kolom template.
 *
 * Bentuk isian laporan berbeda tiap template, sehingga aturannya tidak dapat
 * ditulis di Form Request. Aturan disusun dari `template_fields`, lalu
 * dijalankan dengan validator biasa supaya pesannya tetap Bahasa Indonesia
 * dan bentuk galatnya sama dengan endpoint lain.
 *
 * Kolom hitungan tidak divalidasi dan tidak diterima dari klien — nilainya
 * dihitung server (lihat `bersihkan()`).
 */
final class ValidasiIsianTemplate
{
    /**
     * Memvalidasi seluruh baris pada satu bagian laporan.
     *
     * @param  array<int, array<string, mixed>>  $baris
     * @param  string  $awalan  Awalan kunci galat, mis. "sections.0.items"
     *
     * @throws ValidationException
     */
    public static function periksa(ReportTemplate $template, array $baris, string $awalan): void
    {
        $aturan = [];
        $nama = [];

        foreach ($baris as $index => $_) {
            foreach ($template->fields as $kolom) {
                if ($kolom->dihitungOtomatis()) {
                    continue;
                }

                $kunci = "{$awalan}.{$index}.{$kolom->key}";
                $aturan[$kunci] = self::aturanKolom($kolom);
                // Pengguna melihat label kolom, bukan kunci teknisnya.
                $nama[$kunci] = mb_strtolower($kolom->label);
            }
        }

        if ($aturan === []) {
            return;
        }

        /*
         * Data disusun bersarang memakai `data_set`, bukan ditaruh di bawah
         * satu kunci berisi titik. Aturan di atas memakai notasi titik yang
         * dibaca validator sebagai jalur bersarang; kunci literal
         * "sections.0.items" tidak akan pernah cocok dengan jalur itu, dan
         * seluruh isian akan dianggap kosong.
         */
        $data = [];

        foreach ($baris as $index => $isi) {
            foreach ((array) $isi as $kunciKolom => $nilai) {
                data_set($data, "{$awalan}.{$index}.{$kunciKolom}", $nilai);
            }
        }

        Validator::make($data, $aturan, [], $nama)->validate();
    }

    /**
     * @return list<mixed>
     */
    private static function aturanKolom(TemplateField $kolom): array
    {
        $aturan = [$kolom->is_required ? 'required' : 'nullable'];

        $aturan[] = match ($kolom->type) {
            TemplateField::TIPE_TEXT => 'string',
            TemplateField::TIPE_TEXTAREA => 'string',
            TemplateField::TIPE_INTEGER => 'integer',
            TemplateField::TIPE_DECIMAL => 'numeric',
            TemplateField::TIPE_DATE => 'date',
            // Bulan disimpan sebagai `YYYY-MM`, bukan tanggal penuh.
            TemplateField::TIPE_MONTH => 'date_format:Y-m',
            TemplateField::TIPE_BOOLEAN => 'boolean',
            TemplateField::TIPE_SELECT => 'string',
            default => 'string',
        };

        if (in_array($kolom->type, [TemplateField::TIPE_TEXT, TemplateField::TIPE_SELECT], true)) {
            $aturan[] = 'max:255';
        }

        if ($kolom->type === TemplateField::TIPE_TEXTAREA) {
            $aturan[] = 'max:2000';
        }

        if ($kolom->type === TemplateField::TIPE_SELECT && $kolom->options !== null) {
            $nilaiSah = array_column($kolom->options, 'nilai');

            if ($nilaiSah !== []) {
                $aturan[] = 'in:'.implode(',', $nilaiSah);
            }
        }

        if ($kolom->bertipeAngka()) {
            /*
             * Di-cast ke float lebih dulu. `min_value` dan `max_value` memakai
             * cast `decimal:3`, jadi isinya string `"100.000"` — Laravel masih
             * mengurainya, tetapi menyisipkan string ke aturan angka adalah
             * kerapuhan yang tinggal menunggu giliran, dan pesan galatnya ikut
             * menampilkan nol di belakang koma yang tidak berarti apa-apa bagi
             * pembacanya.
             */
            if ($kolom->min_value !== null) {
                $aturan[] = 'min:'.(float) $kolom->min_value;
            }
            if ($kolom->max_value !== null) {
                $aturan[] = 'max:'.(float) $kolom->max_value;
            }

            /*
             * Angka pecahan dibatasi sesuai pengaturan kolom. Tanpa ini,
             * pembagian di sisi klien dapat menitipkan belasan digit ke dalam
             * kolom JSON, dan angka itu tampil berbeda dari yang dilihat
             * pengisi saat menyimpannya.
             */
            if ($kolom->type === TemplateField::TIPE_DECIMAL && $kolom->desimal !== null) {
                $aturan[] = 'decimal:0,'.$kolom->desimal;
            }
        }

        return $aturan;
    }

    /**
     * Menyaring dan melengkapi isian satu baris sebelum disimpan.
     *
     * - Kunci yang tidak dikenal template dibuang. Klien tidak boleh
     *   menitipkan data sembarangan ke dalam kolom JSON.
     * - Kolom hitungan diisi ulang dari rumusnya, mengabaikan angka kiriman
     *   klien.
     *
     * @param  array<string, mixed>  $isi
     * @return array<string, mixed>
     */
    public static function bersihkan(ReportTemplate $template, array $isi): array
    {
        $bersih = [];

        foreach ($template->fields as $kolom) {
            if ($kolom->dihitungOtomatis()) {
                continue;
            }

            $bersih[$kolom->key] = $isi[$kolom->key] ?? null;
        }

        // Dihitung setelah kolom biasa terkumpul, karena rumusnya merujuk
        // kolom-kolom tersebut.
        foreach ($template->fields as $kolom) {
            if ($kolom->dihitungOtomatis()) {
                $bersih[$kolom->key] = Rumus::hitung($kolom->computed_from, $bersih);
            }
        }

        return $bersih;
    }

    /**
     * Mengambil nilai status baris untuk didenormalisasi ke kolom tersendiri.
     *
     * @param  array<string, mixed>  $isi
     */
    public static function statusBaris(ReportTemplate $template, array $isi): ?string
    {
        $kolomStatus = $template->fields->firstWhere('key', DailyReportItem::KUNCI_STATUS);

        if ($kolomStatus === null || $kolomStatus->type !== TemplateField::TIPE_SELECT) {
            return null;
        }

        $nilai = $isi[DailyReportItem::KUNCI_STATUS] ?? null;

        return is_string($nilai) && $nilai !== '' ? mb_substr($nilai, 0, 24) : null;
    }
}
