<?php

namespace App\Support;

use App\Models\DailyReport;
use App\Models\ReportTemplate;
use App\Models\TemplateField;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Menyusun data laporan menjadi tabel siap export.
 *
 * Dipakai bersama oleh pratinjau, Excel, dan PDF. Ketiganya wajib memakai
 * sumber yang sama: pratinjau yang berbeda isi dari berkas yang diunduh
 * membuat langkah pratinjau kehilangan gunanya (standarisasi §27,
 * export preview-first).
 */
final class DataExport
{
    /** Batas baris per export. Melewati ini, permintaan ditolak. */
    public const BATAS_BARIS = 5000;

    /**
     * @param  array<string, mixed>  $filter
     * @return array<string, mixed>
     */
    public static function susun(User $pengguna, array $filter): array
    {
        $sampai = isset($filter['sampai'])
            ? Carbon::parse($filter['sampai'])
            : Carbon::today();
        $dari = isset($filter['dari'])
            ? Carbon::parse($filter['dari'])
            : $sampai->copy()->startOfMonth();

        $template = isset($filter['template_id'])
            ? ReportTemplate::with('fields')->find($filter['template_id'])
            : null;

        $laporan = DailyReport::query()
            ->visibleTo($pengguna)
            ->with(['user', 'department', 'sections.template.fields', 'sections.items'])
            ->whereBetween('report_date', [$dari, $sampai])
            ->when(
                isset($filter['status']),
                fn ($query) => $query->where('status', $filter['status']),
            )
            ->when(
                isset($filter['departemen_id']),
                fn ($query) => $query->where('department_id', $filter['departemen_id']),
            )
            ->when(
                isset($filter['pengguna_id']),
                fn ($query) => $query->where('user_id', $filter['pengguna_id']),
            )
            ->orderBy('report_date')
            ->orderBy('id')
            ->get();

        /*
         * Satu berkas export memuat satu bentuk tabel. Laporan memakai template
         * yang berbeda-beda, dan menggabungkannya jadi satu tabel akan
         * menghasilkan kolom yang tidak cocok satu sama lain.
         *
         * Bila template tidak dipilih, dipakai template yang paling banyak
         * muncul pada hasil penyaringan.
         */
        $templateTerpakai = $template ?? self::templateTerbanyak($laporan);

        if ($templateTerpakai === null) {
            return [
                'rentang' => self::rentang($dari, $sampai),
                'template' => null,
                'kolom' => [],
                'baris' => [],
                'jumlah_baris' => 0,
                'jumlah_laporan' => 0,
                'terpotong' => false,
            ];
        }

        $kolom = self::kolom($templateTerpakai);
        $baris = self::baris($laporan, $templateTerpakai);

        $terpotong = count($baris) > self::BATAS_BARIS;

        return [
            'rentang' => self::rentang($dari, $sampai),
            'template' => [
                'id' => $templateTerpakai->id,
                'kode' => $templateTerpakai->code,
                'nama' => $templateTerpakai->name,
            ],
            'kolom' => $kolom,
            'baris' => $terpotong ? array_slice($baris, 0, self::BATAS_BARIS) : $baris,
            'jumlah_baris' => count($baris),
            'jumlah_laporan' => $laporan->count(),
            'terpotong' => $terpotong,
        ];
    }

    /**
     * @return array{dari: string, sampai: string, label: string}
     */
    private static function rentang(Carbon $dari, Carbon $sampai): array
    {
        return [
            'dari' => $dari->toDateString(),
            'sampai' => $sampai->toDateString(),
            'label' => $dari->translatedFormat('d F Y').' – '.$sampai->translatedFormat('d F Y'),
        ];
    }

    /**
     * @param  Collection<int, DailyReport>  $laporan
     */
    private static function templateTerbanyak(Collection $laporan): ?ReportTemplate
    {
        $hitung = [];
        $rujukan = [];

        foreach ($laporan as $item) {
            foreach ($item->sections as $bagian) {
                $id = $bagian->report_template_id;
                $hitung[$id] = ($hitung[$id] ?? 0) + $bagian->items->count();
                $rujukan[$id] ??= $bagian->template;
            }
        }

        if ($hitung === []) {
            return null;
        }

        arsort($hitung);

        return $rujukan[array_key_first($hitung)];
    }

    /**
     * Header tabel: kolom tetap lalu kolom milik template.
     *
     * @return array<int, array{kunci: string, label: string, satuan: string|null}>
     */
    private static function kolom(ReportTemplate $template): array
    {
        $kolom = [
            ['kunci' => '_tanggal', 'label' => 'Tanggal', 'satuan' => null],
            ['kunci' => '_penyusun', 'label' => 'Penyusun', 'satuan' => null],
            ['kunci' => '_departemen', 'label' => 'Departemen', 'satuan' => null],
            ['kunci' => '_status', 'label' => 'Status Laporan', 'satuan' => null],
        ];

        foreach ($template->fields as $field) {
            $kolom[] = [
                'kunci' => $field->key,
                // Grup ikut dituliskan supaya kolom bernama sama pada grup
                // berbeda — "QTY Masuk" pada Oven dan Ayak — tidak tertukar.
                'label' => $field->group_label
                    ? "{$field->group_label} — {$field->label}"
                    : $field->label,
                'satuan' => $field->unit,
            ];
        }

        return $kolom;
    }

    /**
     * @param  Collection<int, DailyReport>  $laporan
     * @return array<int, array<string, mixed>>
     */
    private static function baris(Collection $laporan, ReportTemplate $template): array
    {
        $baris = [];

        foreach ($laporan as $item) {
            foreach ($item->sections as $bagian) {
                if ($bagian->report_template_id !== $template->id) {
                    continue;
                }

                foreach ($bagian->items as $isi) {
                    $baris[] = [
                        '_tanggal' => $item->report_date->translatedFormat('d F Y'),
                        '_penyusun' => $item->user->name,
                        '_departemen' => $item->department->name,
                        '_status' => DailyReport::LABEL_STATUS[$item->status] ?? $item->status,
                        ...self::nilaiBaris($isi->data, $template),
                    ];
                }
            }
        }

        return $baris;
    }

    /**
     * Menyiapkan nilai satu baris untuk ditampilkan.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private static function nilaiBaris(array $data, ReportTemplate $template): array
    {
        $hasil = [];

        foreach ($template->fields as $field) {
            $nilai = $data[$field->key] ?? null;

            $hasil[$field->key] = match (true) {
                $nilai === null || $nilai === '' => '',
                $field->type === 'boolean' => $nilai ? 'Ya' : 'Tidak',
                $field->type === 'select' => self::labelPilihan($field->options, $nilai),
                /*
                 * Kolom master menyimpan salinan `{kode, nama}`. Tanpa cabang
                 * ini nilainya mendarat sebagai array di Excel dan terbaca
                 * sebagai "Array" atau kosong.
                 *
                 * Bentuk skalar tetap diterima: kolom yang dulunya `text` lalu
                 * diubah menjadi `master` meninggalkan baris lama berisi
                 * string biasa, dan laporan itu harus tetap terbaca selamanya.
                 */
                $field->type === TemplateField::TIPE_MASTER => is_array($nilai)
                    ? (string) ($nilai['nama'] ?? $nilai['kode'] ?? '')
                    : (string) $nilai,
                default => $nilai,
            };
        }

        return $hasil;
    }

    /**
     * @param  array<int, array{nilai: string, label: string}>|null  $pilihan
     */
    private static function labelPilihan(?array $pilihan, mixed $nilai): string
    {
        foreach ($pilihan ?? [] as $opsi) {
            if (($opsi['nilai'] ?? null) === $nilai) {
                return $opsi['label'];
            }
        }

        return (string) $nilai;
    }
}
