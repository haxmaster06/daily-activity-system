<?php

namespace App\Support\Analitik;

use App\Models\DailyReportItem;
use App\Models\Department;
use App\Models\Tugas;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Angka papan progres harian dan status baris laporan.
 *
 * Kedua sumbernya memakai kosakata status yang sama persis — `belum_mulai`,
 * `dalam_proses`, `selesai` — sehingga dapat dibaca berdampingan tanpa
 * penerjemahan. Kalau salah satunya berubah, halaman ini diam-diam menghitung
 * dua hal berbeda sebagai satu.
 */
final class AngkaProgres
{
    /**
     * @return array<string, mixed>
     */
    public static function susun(PenyaringAnalitik $saring): array
    {
        $tugas = self::tugasTerlihat($saring);

        return [
            'status_per_departemen' => self::statusPerDepartemen($saring, $tugas),
            'sebaran_status_baris' => self::sebaranStatusBaris($saring),
            'beban_penanggung_jawab' => self::beban($tugas),
            'lewat_target' => self::lewatTarget($tugas),
            'umur_kartu' => self::umurKartu($tugas),
            'ringkasan' => self::ringkasan($tugas),
        ];
    }

    /**
     * @return Collection<int, Tugas>
     */
    private static function tugasTerlihat(PenyaringAnalitik $saring): Collection
    {
        $query = Tugas::query()
            ->visibleTo($saring->pengguna)
            ->with(['department:id,name', 'penanggungJawab:id,name']);

        $saring->batasiTugas($query);

        return $query->get();
    }

    /**
     * Sebaran kartu per departemen.
     *
     * Departemen dalam jangkauan yang belum punya kartu sama sekali tetap
     * muncul dengan angka nol — justru ketiadaan kartunya yang perlu terbaca.
     *
     * @param  Collection<int, Tugas>  $tugas
     * @return list<array<string, mixed>>
     */
    private static function statusPerDepartemen(PenyaringAnalitik $saring, Collection $tugas): array
    {
        $departemen = $saring->departemenTerjangkau()
            ->when(
                $saring->departemenId !== [],
                fn (Collection $daftar) => $daftar->whereIn('id', $saring->departemenId),
            );

        $perDepartemen = $tugas->groupBy('department_id');

        return $departemen
            ->map(function (Department $satu) use ($perDepartemen) {
                $miliknya = $perDepartemen->get($satu->id, collect());

                return [
                    'departemen_id' => $satu->id,
                    'departemen' => $satu->name,
                    ...collect(array_keys(Tugas::STATUS))
                        ->mapWithKeys(fn (string $status) => [
                            $status => $miliknya->where('status', $status)->count(),
                        ])
                        ->all(),
                    'total' => $miliknya->count(),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * Sebaran status baris laporan pada rentang.
     *
     * Dibaca dari kolom `progress_status` yang sudah didenormalisasi, bukan
     * dari isi JSON — penyaringan di dalam JSON tidak dapat memakai index.
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

    /**
     * @param  Collection<int, Tugas>  $tugas
     * @return list<array<string, mixed>>
     */
    private static function beban(Collection $tugas): array
    {
        return $tugas
            ->groupBy(fn (Tugas $satu) => $satu->penanggung_jawab_id ?? 0)
            ->map(fn (Collection $kartu) => [
                // Kartu tanpa penanggung jawab dikumpulkan tersendiri, tidak
                // dibuang — pekerjaan tanpa penanggung jawab justru yang paling
                // perlu terlihat.
                'id' => $kartu->first()->penanggung_jawab_id,
                'nama' => $kartu->first()->penanggungJawab?->name ?? 'Belum ditentukan',
                'berjalan' => $kartu->where('status', '!=', Tugas::STATUS_SELESAI)->count(),
                'selesai' => $kartu->where('status', Tugas::STATUS_SELESAI)->count(),
                'telat' => $kartu->filter(fn (Tugas $satu) => $satu->lewatTarget())->count(),
            ])
            ->sortByDesc('berjalan')
            ->values()
            ->take(15)
            ->all();
    }

    /**
     * @param  Collection<int, Tugas>  $tugas
     * @return list<array<string, mixed>>
     */
    private static function lewatTarget(Collection $tugas): array
    {
        return $tugas
            ->filter(fn (Tugas $satu) => $satu->lewatTarget())
            ->sortBy('target_selesai')
            ->take(20)
            ->map(fn (Tugas $satu) => [
                'id' => $satu->id,
                'judul' => $satu->title,
                'status' => $satu->status,
                'label_status' => Tugas::STATUS[$satu->status] ?? $satu->status,
                'departemen' => $satu->department?->name ?? '—',
                'penanggung_jawab_id' => $satu->penanggung_jawab_id,
                'penanggung_jawab' => $satu->penanggungJawab?->name ?? 'Belum ditentukan',
                'target_selesai' => $satu->target_selesai?->toDateString(),
                'telat_hari' => $satu->target_selesai === null
                    ? 0
                    : (int) $satu->target_selesai->diffInDays(Carbon::today()),
            ])
            ->values()
            ->all();
    }

    /**
     * Kartu berjalan yang paling lama tidak selesai.
     *
     * Bukan waktu siklus — perpindahan kolom tidak disimpan riwayatnya —
     * melainkan umur kartu sejak dibuat. Cukup untuk menjawab pertanyaan yang
     * sebenarnya: pekerjaan mana yang menggantung paling lama.
     *
     * @param  Collection<int, Tugas>  $tugas
     * @return list<array<string, mixed>>
     */
    private static function umurKartu(Collection $tugas): array
    {
        return $tugas
            ->where('status', '!=', Tugas::STATUS_SELESAI)
            ->sortBy('created_at')
            ->take(10)
            ->map(fn (Tugas $satu) => [
                'id' => $satu->id,
                'judul' => $satu->title,
                'status' => $satu->status,
                'label_status' => Tugas::STATUS[$satu->status] ?? $satu->status,
                'departemen' => $satu->department?->name ?? '—',
                'penanggung_jawab_id' => $satu->penanggung_jawab_id,
                'penanggung_jawab' => $satu->penanggungJawab?->name ?? 'Belum ditentukan',
                'umur_hari' => (int) $satu->created_at?->diffInDays(Carbon::now()),
            ])
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, Tugas>  $tugas
     * @return array<string, int>
     */
    private static function ringkasan(Collection $tugas): array
    {
        return [
            'total' => $tugas->count(),
            'berjalan' => $tugas->where('status', '!=', Tugas::STATUS_SELESAI)->count(),
            'selesai' => $tugas->where('status', Tugas::STATUS_SELESAI)->count(),
            'telat' => $tugas->filter(fn (Tugas $satu) => $satu->lewatTarget())->count(),
            'tanpa_penanggung_jawab' => $tugas->whereNull('penanggung_jawab_id')->count(),
        ];
    }
}
