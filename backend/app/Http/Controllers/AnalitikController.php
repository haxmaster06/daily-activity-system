<?php

namespace App\Http\Controllers;

use App\Models\DailyReport;
use App\Models\DailyReportItem;
use App\Models\Department;
use App\Models\Tugas;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Angka untuk Executive Analytics.
 *
 * Seluruhnya dikirim dalam **satu** permintaan: yang membukanya adalah Direktur
 * dan GM yang ingin membaca keadaan sekali lihat, bukan menunggu enam
 * permintaan berurutan selesai.
 *
 * ⚠️ Halaman ringkasan adalah jalur kebocoran data yang paling mudah terjadi.
 * Satu query yang lupa `visibleTo()` membuat pemegang jangkauan satu departemen
 * membaca angka seluruh perusahaan — dan tidak ada yang terlihat salah di
 * layar. Tiap query di berkas ini melewati `Tugas::scopeVisibleTo()` atau
 * `DailyReport::scopeVisibleTo()`, dan `AnalitikTest` membuktikannya satu per
 * satu.
 */
class AnalitikController extends Controller
{
    /** Panjang jendela pengamatan, dalam hari. */
    private const RENTANG_HARI = 30;

    public function __invoke(Request $request): JsonResponse
    {
        $pengguna = $request->user();

        $sampai = Carbon::today();
        $dari = $sampai->copy()->subDays(self::RENTANG_HARI - 1);

        return ApiResponse::ok([
            'rentang' => [
                'dari' => $dari->toDateString(),
                'sampai' => $sampai->toDateString(),
                'hari' => self::RENTANG_HARI,
            ],
            'status_per_departemen' => $this->statusPerDepartemen($pengguna),
            'kepatuhan' => $this->kepatuhan($pengguna, $dari, $sampai),
            'sebaran_status_baris' => $this->sebaranStatusBaris($pengguna, $dari, $sampai),
            'beban_penanggung_jawab' => $this->bebanPenanggungJawab($pengguna),
            'lewat_target' => $this->lewatTarget($pengguna),
        ]);
    }

    /**
     * Jumlah kartu per departemen, dipecah menurut kolomnya.
     *
     * Departemen tanpa satu kartu pun sengaja tetap muncul dengan angka nol.
     * Menghilangkannya membuat grafik terlihat seolah departemen itu tidak ada,
     * padahal justru ketiadaan kartunya yang perlu terbaca.
     *
     * @return array<int, array<string, mixed>>
     */
    private function statusPerDepartemen(User $pengguna): array
    {
        $jumlah = Tugas::query()
            ->visibleTo($pengguna)
            ->selectRaw('department_id, status, COUNT(*) as jumlah')
            ->groupBy('department_id', 'status')
            ->get();

        $terpakai = $jumlah->pluck('department_id')->unique();

        $departemen = Department::query()
            ->where('is_system', false)
            ->when(
                ! $pengguna->jangkauan()->korporat(),
                /*
                 * Nama departemen pun tunduk pada jangkauan. Menyebutkan
                 * departemen yang kartunya tidak boleh dibaca tetap
                 * membocorkan susunan organisasi.
                 */
                fn ($query) => $query->where(function ($sub) use ($pengguna, $terpakai): void {
                    $sub->whereIn('id', $pengguna->jangkauan()->departemenId)
                        ->orWhereIn('id', $terpakai);
                }),
            )
            ->orderBy('name')
            ->get();

        return $departemen
            ->map(fn (Department $satu) => [
                'departemen' => $satu->name,
                ...collect(array_keys(Tugas::STATUS))
                    ->mapWithKeys(fn (string $status) => [
                        $status => (int) $jumlah
                            ->where('department_id', $satu->id)
                            ->where('status', $status)
                            ->sum('jumlah'),
                    ])
                    ->all(),
            ])
            ->all();
    }

    /**
     * Kepatuhan pelaporan harian sepanjang rentang.
     *
     * `wajib` dihitung dari susunan anggota **hari ini**, bukan susunan pada
     * tanggal itu — jumlah anggota historis memang tidak pernah disimpan. Itu
     * berarti angka masa lalu bergeser bila ada anggota baru masuk. Diterima,
     * dan disebutkan di layar, karena yang dicari pembacanya adalah bentuk
     * trennya, bukan angka mutlak per hari.
     *
     * @return array<int, array{tanggal: string, melapor: int, wajib: int}>
     */
    private function kepatuhan(User $pengguna, Carbon $dari, Carbon $sampai): array
    {
        $jangkauan = $pengguna->jangkauan();

        $wajib = User::query()
            ->wajibMelapor()
            ->when(
                ! $jangkauan->korporat(),
                fn ($query) => $query->whereIn('department_id', $jangkauan->departemenId),
            )
            ->count();

        /*
         * Dihitung per pelapor, bukan per laporan. Satu orang satu laporan per
         * tanggal sudah dijaga unique index, tetapi menghitung barisnya
         * langsung membuat angka kepatuhan bergantung pada penjaga itu — dan
         * penjaga yang runtuh diam-diam menghasilkan kepatuhan di atas 100%.
         */
        $perTanggal = DailyReport::query()
            ->visibleTo($pengguna)
            ->whereBetween('report_date', [$dari, $sampai])
            ->selectRaw('report_date, COUNT(DISTINCT user_id) as jumlah')
            ->groupBy('report_date')
            ->pluck('jumlah', 'report_date');

        $hasil = [];

        for ($tanggal = $dari->copy(); $tanggal->lte($sampai); $tanggal->addDay()) {
            $kunci = $tanggal->toDateString();

            $hasil[] = [
                'tanggal' => $kunci,
                'melapor' => (int) ($this->cariTanggal($perTanggal, $kunci) ?? 0),
                'wajib' => $wajib,
            ];
        }

        return $hasil;
    }

    /**
     * Nilai untuk satu tanggal, apa pun bentuk kuncinya.
     *
     * MySQL mengembalikan `report_date` sebagai `Y-m-d`, sedangkan SQLite yang
     * dipakai sebagian test mengembalikannya lengkap dengan jam. Mencocokkan
     * mentah-mentah membuat seluruh angka kepatuhan menjadi nol hanya pada
     * salah satu dari keduanya — dan yang nol itu terlihat masuk akal.
     *
     * @param  Collection<array-key, mixed>  $perTanggal
     */
    private function cariTanggal(Collection $perTanggal, string $tanggal): ?int
    {
        foreach ($perTanggal as $kunci => $nilai) {
            if (str_starts_with((string) $kunci, $tanggal)) {
                return (int) $nilai;
            }
        }

        return null;
    }

    /**
     * Sebaran status baris laporan sepanjang rentang.
     *
     * Dibaca dari kolom `progress_status` yang sudah didenormalisasi, bukan
     * dari isi JSON — penyaringan di dalam JSON tidak dapat memakai index.
     *
     * @return array<int, array{status: string, label: string, jumlah: int}>
     */
    private function sebaranStatusBaris(User $pengguna, Carbon $dari, Carbon $sampai): array
    {
        $jumlah = DailyReportItem::query()
            ->whereNotNull('progress_status')
            ->whereHas(
                'section.report',
                fn ($query) => $query
                    ->visibleTo($pengguna)
                    ->whereBetween('report_date', [$dari, $sampai]),
            )
            ->selectRaw('progress_status, COUNT(*) as jumlah')
            ->groupBy('progress_status')
            ->pluck('jumlah', 'progress_status');

        return collect(DailyReportItem::LABEL_STATUS)
            ->map(fn (string $label, string $status) => [
                'status' => $status,
                'label' => $label,
                'jumlah' => (int) ($jumlah[$status] ?? 0),
            ])
            ->values()
            ->all();
    }

    /**
     * Kartu yang belum selesai, per penanggung jawab.
     *
     * Kartu tanpa penanggung jawab dikumpulkan tersendiri, tidak dibuang.
     * Pekerjaan yang tidak ada penanggung jawabnya justru yang paling perlu
     * terlihat oleh pembaca halaman ini.
     *
     * @return array<int, array{nama: string, berjalan: int, selesai: int}>
     */
    private function bebanPenanggungJawab(User $pengguna): array
    {
        return Tugas::query()
            ->visibleTo($pengguna)
            ->with('penanggungJawab')
            ->get()
            ->groupBy(fn (Tugas $satu) => $satu->penanggung_jawab_id ?? 0)
            ->map(fn (Collection $kartu) => [
                'nama' => $kartu->first()->penanggungJawab?->name ?? 'Belum ditentukan',
                'berjalan' => $kartu->where('status', '!=', Tugas::STATUS_SELESAI)->count(),
                'selesai' => $kartu->where('status', Tugas::STATUS_SELESAI)->count(),
            ])
            ->sortByDesc('berjalan')
            ->values()
            ->take(15)
            ->all();
    }

    /**
     * Kartu yang sudah melewati target selesai dan belum rampung.
     *
     * @return array<int, array<string, mixed>>
     */
    private function lewatTarget(User $pengguna): array
    {
        return Tugas::query()
            ->visibleTo($pengguna)
            ->with(['department', 'penanggungJawab'])
            ->whereNotNull('target_selesai')
            ->where('target_selesai', '<', Carbon::today()->toDateString())
            ->where('status', '!=', Tugas::STATUS_SELESAI)
            ->orderBy('target_selesai')
            ->limit(20)
            ->get()
            ->map(fn (Tugas $satu) => [
                'id' => $satu->id,
                'judul' => $satu->title,
                'status' => $satu->status,
                'label_status' => Tugas::STATUS[$satu->status] ?? $satu->status,
                'departemen' => $satu->department?->name ?? '—',
                'penanggung_jawab' => $satu->penanggungJawab?->name ?? 'Belum ditentukan',
                'target_selesai' => $satu->target_selesai?->toDateString(),
                'telat_hari' => $satu->target_selesai === null
                    ? 0
                    : $satu->target_selesai->diffInDays(Carbon::today()),
            ])
            ->all();
    }
}
