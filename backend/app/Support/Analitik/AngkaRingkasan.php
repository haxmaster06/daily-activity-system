<?php

namespace App\Support\Analitik;

use App\Models\DailyReport;
use App\Models\DailyReportItem;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Halaman pertama Executive Analytics: yang perlu diketahui dalam sepuluh detik.
 *
 * Isinya sengaja sedikit dan berpembanding. Angka tanpa pembanding hampir tidak
 * berarti — "82% patuh" baru berbicara setelah diketahui pekan lalu 91%. Karena
 * itu tiap kartu di sini menyertakan periode sebelumnya yang panjangnya sama.
 */
final class AngkaRingkasan
{
    /**
     * @return array<string, mixed>
     */
    public static function susun(PenyaringAnalitik $saring): array
    {
        $kepatuhan = AngkaKepatuhan::susun($saring);

        return [
            'kartu' => self::kartu($saring, $kepatuhan),
            'tren_kepatuhan' => $kepatuhan['per_hari'],
            'sebaran_status_baris' => self::sebaranStatusBaris($saring),
            'sorotan' => self::sorotan($kepatuhan),
        ];
    }

    /**
     * @param  array<string, mixed>  $kepatuhan
     * @return list<array<string, mixed>>
     */
    private static function kartu(
        PenyaringAnalitik $saring,
        array $kepatuhan,
    ): array {
        $sekarang = self::persenKepatuhan($kepatuhan['per_hari']);
        $sebelumnya = self::persenKepatuhanSebelumnya($saring);

        $laporan = self::jumlahLaporan($saring);
        $menunggu = self::menungguTinjauan($saring);

        return [
            [
                'kunci' => 'kepatuhan',
                'label' => 'Kepatuhan pelaporan',
                'nilai' => $sekarang,
                'satuan' => '%',
                'sebelumnya' => $sebelumnya,
                'arah_baik' => 'naik',
                'keterangan' => 'Bagian hari kerja yang benar-benar terisi laporan.',
            ],
            [
                'kunci' => 'laporan',
                'label' => 'Laporan masuk',
                'nilai' => $laporan['sekarang'],
                'satuan' => 'laporan',
                'sebelumnya' => $laporan['sebelumnya'],
                'arah_baik' => 'naik',
                'keterangan' => 'Jumlah laporan pada rentang ini.',
            ],
            [
                'kunci' => 'menunggu',
                'label' => 'Menunggu tinjauan',
                'nilai' => $menunggu,
                'satuan' => 'laporan',
                'sebelumnya' => null,
                'arah_baik' => 'turun',
                'keterangan' => 'Sudah dikirim, belum ditinjau siapa pun.',
            ],
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $perHari
     */
    private static function persenKepatuhan(array $perHari): int
    {
        /*
         * Akhir pekan dikeluarkan dari hitungan. Banyak departemen memang tidak
         * melapor hari Minggu, dan memasukkannya membuat kepatuhan seluruh
         * perusahaan terlihat buruk sepanjang tahun tanpa ada yang salah.
         */
        $kerja = array_filter($perHari, fn (array $satu) => ! $satu['akhir_pekan']);

        if ($kerja === []) {
            return 0;
        }

        $melapor = array_sum(array_column($kerja, 'melapor'));
        $wajib = array_sum(array_column($kerja, 'wajib'));

        return $wajib === 0 ? 0 : (int) round($melapor / $wajib * 100);
    }

    /**
     * Kepatuhan pada periode sebelumnya yang panjangnya sama persis.
     */
    private static function persenKepatuhanSebelumnya(PenyaringAnalitik $saring): ?int
    {
        $hari = $saring->jumlahHari();

        $sampai = $saring->dari->copy()->subDay();
        $dari = $sampai->copy()->subDays($hari - 1);

        $wajib = User::query()
            ->wajibMelapor()
            ->when(
                ! $saring->pengguna->jangkauan()->korporat(),
                fn ($query) => $query->whereIn(
                    'department_id',
                    $saring->pengguna->jangkauan()->departemenId,
                ),
            )
            ->when(
                $saring->departemenId !== [],
                fn ($query) => $query->whereIn('department_id', $saring->departemenId),
            )
            // Penyebutnya menyempit bersama pembilangnya — alasannya sama persis
            // dengan yang dicatat pada `AngkaKepatuhan::anggotaWajibLapor()`.
            ->when(
                $saring->penggunaId !== [],
                fn ($query) => $query->whereIn('id', $saring->penggunaId),
            )
            ->count();

        if ($wajib === 0) {
            return null;
        }

        $query = DailyReport::query()
            ->visibleTo($saring->pengguna)
            ->whereBetween('report_date', [$dari, $sampai]);

        $saring->batasiLaporan($query);

        $laporan = $query->get(['user_id', 'report_date']);

        $hariKerja = 0;
        for ($tanggal = $dari->copy(); $tanggal->lte($sampai); $tanggal->addDay()) {
            if (! $tanggal->isWeekend()) {
                $hariKerja++;
            }
        }

        if ($hariKerja === 0) {
            return null;
        }

        $melapor = $laporan
            ->reject(fn ($satu) => Carbon::parse($satu->report_date)->isWeekend())
            ->count();

        return (int) round($melapor / ($wajib * $hariKerja) * 100);
    }

    /**
     * @return array{sekarang: int, sebelumnya: int}
     */
    private static function jumlahLaporan(PenyaringAnalitik $saring): array
    {
        $hitung = function (Carbon $dari, Carbon $sampai) use ($saring): int {
            $query = DailyReport::query()
                ->visibleTo($saring->pengguna)
                ->whereBetween('report_date', [$dari, $sampai]);

            $saring->batasiLaporan($query);

            return $query->count();
        };

        $hari = $saring->jumlahHari();
        $sampaiLalu = $saring->dari->copy()->subDay();

        return [
            'sekarang' => $hitung($saring->dari, $saring->sampai),
            'sebelumnya' => $hitung($sampaiLalu->copy()->subDays($hari - 1), $sampaiLalu),
        ];
    }

    private static function menungguTinjauan(PenyaringAnalitik $saring): int
    {
        $query = DailyReport::query()
            ->visibleTo($saring->pengguna)
            ->where('status', DailyReport::STATUS_DIKIRIM)
            ->whereBetween('report_date', [$saring->dari, $saring->sampai]);

        $saring->batasiLaporan($query);

        return $query->count();
    }

    /**
     * Kalimat yang langsung menunjuk apa yang perlu ditindaklanjuti.
     *
     * Bagian ini yang paling sering dibaca, dan satu-satunya yang tidak menuntut
     * pembacanya menafsirkan grafik.
     *
     * @param  array<string, mixed>  $kepatuhan
     * @return list<array{jenis: string, teks: string}>
     */
    private static function sorotan(array $kepatuhan): array
    {
        $sorotan = [];

        $departemen = collect($kepatuhan['per_departemen']);

        if ($departemen->isNotEmpty()) {
            $terbaik = $departemen->first();
            $terburuk = $departemen->last();

            if ($terbaik['persen'] !== $terburuk['persen']) {
                $sorotan[] = [
                    'jenis' => 'baik',
                    'teks' => "{$terbaik['departemen']} paling tertib melapor, {$terbaik['persen']}%.",
                ];
                $sorotan[] = [
                    'jenis' => 'perhatian',
                    'teks' => "{$terburuk['departemen']} paling tertinggal, {$terburuk['persen']}%.",
                ];
            }
        }

        $bolong = collect($kepatuhan['per_orang'])->where('bolong_beruntun', '>=', 3);

        if ($bolong->isNotEmpty()) {
            $pertama = $bolong->first();
            $sisa = $bolong->count() - 1;

            $sorotan[] = [
                'jenis' => 'perhatian',
                'teks' => $sisa > 0
                    ? "{$pertama['nama']} dan {$sisa} orang lain tidak mengisi laporan 3 hari atau lebih berturut-turut."
                    : "{$pertama['nama']} tidak mengisi laporan {$pertama['bolong_beruntun']} hari berturut-turut.",
            ];
        }

        if ($sorotan === []) {
            $sorotan[] = [
                'jenis' => 'baik',
                'teks' => 'Tidak ada yang perlu ditindaklanjuti pada rentang ini.',
            ];
        }

        return array_slice($sorotan, 0, 5);
    }

    /**
     * Sebaran status baris laporan pada rentang.
     *
     * Dibaca dari kolom `progress_status` yang sudah didenormalisasi, bukan
     * dari isi JSON — penyaringan di dalam JSON tidak dapat memakai index.
     *
     * Sebelumnya tinggal di `AngkaProgres`, dan ikut terbawa ke sini saat
     * fitur kartu progres dihapus. Isinya tidak pernah berkaitan dengan kartu:
     * yang dihitung adalah status BARIS LAPORAN, yang masih hidup dan masih
     * dibaca halaman Monitoring.
     *
     * @return list<array<string, mixed>>
     */
    private static function sebaranStatusBaris(PenyaringAnalitik $saring): array
    {
        $jumlah = DailyReportItem::query()
            ->whereNotNull('progress_status')
            ->whereHas('section.report', function ($query) use ($saring): void {
                $query->visibleTo($saring->pengguna)
                    ->whereBetween('report_date', [$saring->dari, $saring->sampai]);

                $saring->batasiLaporan($query);
            })
            ->selectRaw('progress_status, COUNT(*) as jumlah')
            ->groupBy('progress_status')
            ->pluck('jumlah', 'progress_status');

        $total = (int) $jumlah->sum();

        return collect(DailyReportItem::LABEL_STATUS)
            ->map(fn (string $label, string $status) => [
                'status' => $status,
                'label' => $label,
                'jumlah' => (int) ($jumlah[$status] ?? 0),
                'persen' => $total === 0 ? 0 : (int) round(($jumlah[$status] ?? 0) / $total * 100),
            ])
            ->values()
            ->all();
    }
}
