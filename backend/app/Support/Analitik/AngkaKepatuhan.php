<?php

namespace App\Support\Analitik;

use App\Models\DailyReport;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Kepatuhan pelaporan harian: siapa melapor, kapan, dan siapa yang tertinggal.
 *
 * Yang dicari pembacanya di sini bukan angka rata-rata, melainkan **nama**:
 * departemen mana yang tertinggal, dan siapa saja yang sudah beberapa hari
 * tidak mengisi. Karena itu tiap angka disertai daftar orangnya.
 */
final class AngkaKepatuhan
{
    /**
     * @return array<string, mixed>
     */
    public static function susun(PenyaringAnalitik $saring): array
    {
        $anggota = self::anggotaWajibLapor($saring);
        $laporan = self::laporanPadaRentang($saring);

        return [
            'per_hari' => self::perHari($saring, $anggota, $laporan),
            'per_departemen' => self::perDepartemen($saring, $anggota, $laporan),
            'peta_panas' => self::petaPanas($saring, $anggota, $laporan),
            'per_orang' => self::perOrang($saring, $anggota, $laporan),
            'jam_kirim' => self::jamKirim($saring),
        ];
    }

    /**
     * Anggota yang memang wajib melapor, sesudah disaring jangkauan.
     *
     * Akun sistem dan departemen sistem dikecualikan `scopeWajibMelapor()` —
     * Super Admin bukan staf, sehingga menghitungnya sebagai "belum melapor"
     * membuat angka kepatuhan selamanya di bawah seratus persen.
     *
     * @return Collection<int, User>
     */
    private static function anggotaWajibLapor(PenyaringAnalitik $saring): Collection
    {
        $jangkauan = $saring->pengguna->jangkauan();

        return User::query()
            ->with('department:id,name')
            ->wajibMelapor()
            ->when(
                ! $jangkauan->korporat(),
                fn ($query) => $query->whereIn('department_id', $jangkauan->departemenId),
            )
            ->when(
                $saring->departemenId !== [],
                fn ($query) => $query->whereIn('department_id', $saring->departemenId),
            )
            ->orderBy('name')
            ->get(['id', 'name', 'department_id']);
    }

    /**
     * Pasangan (pengguna, tanggal) yang sudah punya laporan.
     *
     * @return Collection<int, object{user_id: int, department_id: int, report_date: string, status: string}>
     */
    private static function laporanPadaRentang(PenyaringAnalitik $saring): Collection
    {
        $query = DailyReport::query()
            ->visibleTo($saring->pengguna)
            ->whereBetween('report_date', [$saring->dari, $saring->sampai]);

        $saring->batasiDepartemen($query);

        return $query
            ->get(['user_id', 'department_id', 'report_date', 'status'])
            ->map(fn (DailyReport $satu) => (object) [
                'user_id' => (int) $satu->user_id,
                'department_id' => (int) $satu->department_id,
                'report_date' => Carbon::parse($satu->report_date)->toDateString(),
                'status' => $satu->status,
            ]);
    }

    /**
     * Kepatuhan per hari.
     *
     * `wajib` memakai susunan anggota **hari ini**, bukan susunan pada tanggal
     * itu — jumlah anggota historis memang tidak pernah disimpan. Disebutkan di
     * layar supaya pembacanya tahu angka masa lalu bergeser bila ada anggota
     * baru masuk.
     *
     * @param  Collection<int, User>  $anggota
     * @param  Collection<int, object>  $laporan
     * @return list<array<string, mixed>>
     */
    private static function perHari(
        PenyaringAnalitik $saring,
        Collection $anggota,
        Collection $laporan,
    ): array {
        $wajib = $anggota->count();
        $perTanggal = $laporan->groupBy('report_date');

        return array_map(function (string $tanggal) use ($wajib, $perTanggal) {
            $hari = $perTanggal->get($tanggal, collect());
            $melapor = $hari->pluck('user_id')->unique()->count();

            return [
                'tanggal' => $tanggal,
                'melapor' => $melapor,
                'wajib' => $wajib,
                'persen' => $wajib === 0 ? 0 : (int) round($melapor / $wajib * 100),
                // Akhir pekan dipisahkan supaya tidak terbaca sebagai
                // kemerosotan; banyak departemen memang tidak melapor Minggu.
                'akhir_pekan' => Carbon::parse($tanggal)->isWeekend(),
                'dikirim' => $hari->where('status', '!=', DailyReport::STATUS_DRAF)->count(),
                'draf' => $hari->where('status', DailyReport::STATUS_DRAF)->count(),
            ];
        }, $saring->tanggalRentang());
    }

    /**
     * @param  Collection<int, User>  $anggota
     * @param  Collection<int, object>  $laporan
     * @return list<array<string, mixed>>
     */
    private static function perDepartemen(
        PenyaringAnalitik $saring,
        Collection $anggota,
        Collection $laporan,
    ): array {
        $hari = $saring->jumlahHari();

        return $anggota
            ->groupBy('department_id')
            ->map(function (Collection $orang, $departemenId) use ($laporan, $hari) {
                $idOrang = $orang->pluck('id')->all();

                $miliknya = $laporan->whereIn('user_id', $idOrang);
                $seharusnya = count($idOrang) * $hari;

                return [
                    'departemen_id' => (int) $departemenId,
                    'departemen' => $orang->first()->department?->name ?? '—',
                    'anggota' => count($idOrang),
                    'laporan' => $miliknya->count(),
                    'seharusnya' => $seharusnya,
                    'persen' => $seharusnya === 0
                        ? 0
                        : (int) round($miliknya->count() / $seharusnya * 100),
                ];
            })
            ->sortByDesc('persen')
            ->values()
            ->all();
    }

    /**
     * Peta panas departemen × hari.
     *
     * Bentuk yang paling cepat dibaca seorang eksekutif: satu pandangan cukup
     * untuk menemukan baris yang gelap — departemen yang berhari-hari tidak
     * melapor — tanpa membaca satu angka pun.
     *
     * @param  Collection<int, User>  $anggota
     * @param  Collection<int, object>  $laporan
     * @return array<string, mixed>
     */
    private static function petaPanas(
        PenyaringAnalitik $saring,
        Collection $anggota,
        Collection $laporan,
    ): array {
        $tanggal = $saring->tanggalRentang();
        $perDepartemen = $anggota->groupBy('department_id');

        $baris = $perDepartemen
            ->map(function (Collection $orang, $departemenId) use ($laporan, $tanggal) {
                $idOrang = $orang->pluck('id')->all();
                $miliknya = $laporan->whereIn('user_id', $idOrang)->groupBy('report_date');

                return [
                    'departemen_id' => (int) $departemenId,
                    'departemen' => $orang->first()->department?->name ?? '—',
                    'anggota' => count($idOrang),
                    'sel' => array_map(function (string $satu) use ($miliknya, $idOrang) {
                        $melapor = $miliknya->get($satu, collect())
                            ->pluck('user_id')->unique()->count();

                        return [
                            'tanggal' => $satu,
                            'melapor' => $melapor,
                            'persen' => count($idOrang) === 0
                                ? 0
                                : (int) round($melapor / count($idOrang) * 100),
                        ];
                    }, $tanggal),
                ];
            })
            ->sortBy('departemen')
            ->values()
            ->all();

        return ['tanggal' => $tanggal, 'baris' => $baris];
    }

    /**
     * Kepatuhan per orang, beserta berapa hari berturut-turut ia tidak mengisi.
     *
     * @param  Collection<int, User>  $anggota
     * @param  Collection<int, object>  $laporan
     * @return list<array<string, mixed>>
     */
    private static function perOrang(
        PenyaringAnalitik $saring,
        Collection $anggota,
        Collection $laporan,
    ): array {
        $hari = $saring->jumlahHari();
        $perOrang = $laporan->groupBy('user_id');
        $mundur = array_reverse($saring->tanggalRentang());

        return $anggota
            ->map(function (User $orang) use ($perOrang, $hari, $mundur) {
                $miliknya = $perOrang->get($orang->id, collect());
                $tanggalnya = $miliknya->pluck('report_date')->flip();

                /*
                 * Dihitung mundur dari hari terakhir rentang. Yang dicari
                 * pembacanya bukan total hari bolong, melainkan apakah
                 * seseorang sedang berhenti mengisi sekarang.
                 */
                $beruntun = 0;
                foreach ($mundur as $tanggal) {
                    if ($tanggalnya->has($tanggal)) {
                        break;
                    }
                    $beruntun++;
                }

                return [
                    'id' => $orang->id,
                    'nama' => $orang->name,
                    'departemen' => $orang->department?->name ?? '—',
                    'laporan' => $miliknya->count(),
                    'seharusnya' => $hari,
                    'persen' => $hari === 0 ? 0 : (int) round($miliknya->count() / $hari * 100),
                    'terakhir' => $miliknya->max('report_date'),
                    'bolong_beruntun' => $beruntun,
                ];
            })
            ->sortBy([['bolong_beruntun', 'desc'], ['persen', 'asc']])
            ->values()
            ->all();
    }

    /**
     * Sebaran jam pengiriman laporan.
     *
     * Menjawab pertanyaan yang tidak terjawab angka kepatuhan: tim melapor di
     * jam berapa. Kalau puncaknya jauh lewat jam kerja, kepatuhan seratus
     * persen pun bukan kabar baik.
     *
     * @return list<array{jam: int, jumlah: int}>
     */
    private static function jamKirim(PenyaringAnalitik $saring): array
    {
        $query = DailyReport::query()
            ->visibleTo($saring->pengguna)
            ->whereBetween('report_date', [$saring->dari, $saring->sampai])
            ->whereNotNull('submitted_at');

        $saring->batasiDepartemen($query);

        $jumlah = $query
            ->selectRaw('HOUR(submitted_at) AS jam, COUNT(*) AS jumlah')
            ->groupBy('jam')
            ->pluck('jumlah', 'jam');

        return array_map(
            fn (int $jam) => ['jam' => $jam, 'jumlah' => (int) ($jumlah[$jam] ?? 0)],
            range(0, 23),
        );
    }
}
