<?php

namespace App\Support\Analitik;

use App\Models\DailyReport;
use App\Models\DailyReportItem;

/**
 * Rekap Daily Activity seluruh departemen dalam satu tabel.
 *
 * Pertanyaan yang dijawab halaman ini: **departemen mana yang tertinggal.**
 * Berbeda dari tab Departemen, yang menampilkan kartu per departemen dan
 * menjawab "seperti apa pekerjaan departemen ini" — kartu tidak dapat
 * dibandingkan kolom per kolom, matriks bisa. Berbeda pula dari /monitoring,
 * yang bertanya per orang dan per hari.
 *
 * Sebagian besar angkanya sudah dihitung `AngkaKepatuhan::perDepartemen()` pada
 * tiap permintaan ringkasan, tetapi selama ini hanya dipakai menyusun dua
 * kalimat. Yang benar-benar baru di sini hanya sebaran status baris per
 * departemen — `AngkaProgres::statusPerDepartemen()` mengelompokkan kartu Tugas,
 * bukan baris laporan.
 */
class AngkaRekap
{
    /**
     * @return array<string, mixed>
     */
    public static function susun(PenyaringAnalitik $saring): array
    {
        $kepatuhan = AngkaKepatuhan::susun($saring)['per_departemen'];
        $status = self::statusBarisPerDepartemen($saring);

        $baris = collect($kepatuhan)
            ->map(function (array $satu) use ($status): array {
                $miliknya = $status[$satu['departemen_id']] ?? [];

                return [
                    ...$satu,
                    'baris' => (int) array_sum($miliknya),
                    'status' => collect(DailyReportItem::LABEL_STATUS)
                        ->map(fn (string $label, string $kunci) => [
                            'status' => $kunci,
                            'label' => $label,
                            'jumlah' => (int) ($miliknya[$kunci] ?? 0),
                        ])
                        ->values()
                        ->all(),
                ];
            })
            ->sortBy('departemen')
            ->values()
            ->all();

        return [
            'departemen' => $baris,
            'total' => self::total($baris),
        ];
    }

    /**
     * Jumlah baris laporan per departemen per status.
     *
     * Dikelompokkan lewat `daily_reports.department_id`, bukan departemen
     * penyusunnya sekarang: laporan mencatat departemen tempat pekerjaan itu
     * dilakukan, dan orang dapat berpindah departemen.
     *
     * @return array<int, array<string, int>>
     */
    private static function statusBarisPerDepartemen(PenyaringAnalitik $saring): array
    {
        return DailyReportItem::query()
            ->join(
                'daily_report_sections as s',
                's.id',
                '=',
                'daily_report_items.daily_report_section_id',
            )
            ->joinSub(
                DailyReport::query()
                    ->visibleTo($saring->pengguna)
                    ->whereBetween('report_date', [$saring->dari, $saring->sampai])
                    ->tap(fn ($query) => $saring->batasiLaporan($query))
                    ->select(['id', 'department_id']),
                'r',
                'r.id',
                '=',
                's.daily_report_id',
            )
            ->whereNotNull('daily_report_items.progress_status')
            ->selectRaw('r.department_id, daily_report_items.progress_status, COUNT(*) as jumlah')
            ->groupBy('r.department_id', 'daily_report_items.progress_status')
            ->get()
            ->groupBy('department_id')
            ->map(fn ($baris) => $baris->pluck('jumlah', 'progress_status')
                ->map(fn ($n) => (int) $n)
                ->all())
            ->all();
    }

    /**
     * Baris total.
     *
     * Kepatuhan total dihitung ulang dari jumlah laporan dibagi jumlah
     * seharusnya — BUKAN rata-rata persentase tiap departemen. Rata-rata
     * persentase memberi bobot sama kepada departemen beranggota dua dan
     * beranggota dua puluh, dan angkanya menyesatkan justru saat paling
     * diperhatikan.
     *
     * @param  array<int, array<string, mixed>>  $baris
     * @return array<string, mixed>
     */
    private static function total(array $baris): array
    {
        $laporan = array_sum(array_column($baris, 'laporan'));
        $seharusnya = array_sum(array_column($baris, 'seharusnya'));

        return [
            'anggota' => array_sum(array_column($baris, 'anggota')),
            'laporan' => $laporan,
            'seharusnya' => $seharusnya,
            'persen' => $seharusnya === 0 ? 0 : (int) round($laporan / $seharusnya * 100),
            'baris' => array_sum(array_column($baris, 'baris')),
            'status' => collect(DailyReportItem::LABEL_STATUS)
                ->map(fn (string $label, string $kunci) => [
                    'status' => $kunci,
                    'label' => $label,
                    'jumlah' => array_sum(array_map(
                        fn (array $satu) => collect($satu['status'])
                            ->firstWhere('status', $kunci)['jumlah'] ?? 0,
                        $baris,
                    )),
                ])
                ->values()
                ->all(),
        ];
    }
}
