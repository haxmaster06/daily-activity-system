<?php

namespace App\Http\Controllers;

use App\Models\DailyReport;
use App\Models\DailyReportItem;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\KatalogIzin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    /**
     * Ringkasan untuk dashboard.
     *
     * Seluruh hitungan memakai `DailyReport::scopeVisibleTo()` — angka yang
     * dilihat pengguna tidak boleh mencakup laporan yang tidak boleh ia buka.
     * Staff melihat angka dirinya sendiri, Supervisor departemennya, Manager
     * dan Administrator seluruhnya.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $pengguna = $request->user();

        $hariIni = Carbon::today();
        $awalBulan = $hariIni->copy()->startOfMonth();

        $terlihat = fn () => DailyReport::query()->visibleTo($pengguna);

        return ApiResponse::ok([
            'kartu' => [
                'laporan_hari_ini' => $terlihat()->whereDate('report_date', $hariIni)->count(),
                'laporan_bulan_ini' => $terlihat()
                    ->whereBetween('report_date', [$awalBulan, $hariIni])
                    ->count(),
                'draf_belum_dikirim' => $terlihat()
                    ->where('status', DailyReport::STATUS_DRAF)
                    ->count(),
                'menunggu_tinjauan' => $terlihat()
                    ->where('status', DailyReport::STATUS_DIKIRIM)
                    ->count(),
            ],

            'laporan_saya_hari_ini' => $this->laporanSayaHariIni($pengguna, $hariIni),
            'status_aktivitas' => $this->rekapStatusAktivitas($pengguna, $awalBulan, $hariIni),
            'terbaru' => $this->laporanTerbaru($pengguna),
            'belum_lapor' => $this->belumLaporHariIni($pengguna, $hariIni),
        ]);
    }

    /**
     * Laporan pengguna sendiri untuk hari ini, bila sudah ada.
     *
     * Dipakai dashboard untuk mengarahkan langsung: melanjutkan draf, atau
     * membuat laporan baru.
     *
     * @return array<string, mixed>|null
     */
    private function laporanSayaHariIni(User $pengguna, Carbon $hariIni): ?array
    {
        $laporan = DailyReport::where('user_id', $pengguna->getKey())
            ->whereDate('report_date', $hariIni)
            ->first();

        if ($laporan === null) {
            return null;
        }

        return [
            'id' => $laporan->id,
            'status' => $laporan->status,
            'label_status' => DailyReport::LABEL_STATUS[$laporan->status] ?? $laporan->status,
            'dapat_disunting' => $laporan->masihDraf(),
        ];
    }

    /**
     * Sebaran status aktivitas bulan berjalan.
     *
     * Dihitung dari kolom `progress_status` yang sudah didenormalisasi, bukan
     * dari isi JSON — penyaringan di dalam JSON tidak dapat memakai index.
     *
     * @return array<int, array{status: string, label: string, jumlah: int}>
     */
    private function rekapStatusAktivitas(User $pengguna, Carbon $dari, Carbon $sampai): array
    {
        $jumlah = DailyReportItem::query()
            ->whereNotNull('progress_status')
            ->whereHas('section.report', function ($query) use ($pengguna, $dari, $sampai) {
                $query->visibleTo($pengguna)->whereBetween('report_date', [$dari, $sampai]);
            })
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
     * @return array<int, array<string, mixed>>
     */
    private function laporanTerbaru(User $pengguna): array
    {
        return DailyReport::query()
            ->visibleTo($pengguna)
            ->with(['user', 'department'])
            ->orderByDesc('report_date')
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(fn (DailyReport $laporan) => [
                'id' => $laporan->id,
                'tanggal' => $laporan->report_date->toDateString(),
                'status' => $laporan->status,
                'label_status' => DailyReport::LABEL_STATUS[$laporan->status] ?? $laporan->status,
                'penyusun' => $laporan->user->name,
                'departemen' => $laporan->department->name,
            ])
            ->all();
    }

    /**
     * Anggota yang belum membuat laporan hari ini.
     *
     * Hanya untuk yang boleh memantau tim — bagi yang tidak, daftar ini tidak
     * punya arti dan justru membocorkan siapa saja rekan sedepartemennya yang
     * terlambat.
     *
     * @return array<int, array{id: int, nama: string, departemen: string}>|null
     */
    private function belumLaporHariIni(User $pengguna, Carbon $hariIni): ?array
    {
        if (! $pengguna->boleh(KatalogIzin::MONITORING_LIHAT)) {
            return null;
        }

        $jangkauan = $pengguna->jangkauan();

        return User::query()
            ->with('department')
            ->where('is_active', true)
            ->when(
                ! $jangkauan->korporat(),
                fn ($query) => $query->whereIn('department_id', $jangkauan->departemenId),
            )
            ->whereDoesntHave('laporan', fn ($query) => $query->whereDate('report_date', $hariIni))
            ->orderBy('name')
            ->limit(20)
            ->get()
            ->map(fn (User $item) => [
                'id' => $item->id,
                'nama' => $item->name,
                'departemen' => $item->department?->name ?? '—',
            ])
            ->all();
    }
}
