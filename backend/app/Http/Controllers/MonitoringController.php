<?php

namespace App\Http\Controllers;

use App\Models\DailyReport;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class MonitoringController extends Controller
{
    /**
     * Ringkasan kepatuhan pelaporan per anggota dalam satu rentang tanggal.
     *
     * Yang ditanyakan supervisor bukan "laporan apa saja yang masuk", tetapi
     * "siapa yang sudah dan belum melapor". Daftar laporan mentah sudah
     * tersedia di `/api/laporan`; halaman ini menjawab pertanyaan yang berbeda.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $pengguna = $request->user();

        // Deny by default: hanya Supervisor ke atas.
        if (! $pengguna->canMonitorTeam()) {
            return ApiResponse::error('Anda tidak memiliki akses ke data ini.', 403);
        }

        $data = $request->validate([
            'dari' => ['nullable', 'date'],
            'sampai' => ['nullable', 'date', 'after_or_equal:dari'],
            'departemen_id' => ['nullable', 'integer', 'exists:departments,id'],
            'cari' => ['nullable', 'string', 'max:100'],
        ], attributes: [
            'dari' => 'tanggal mulai',
            'sampai' => 'tanggal akhir',
            'departemen_id' => 'departemen',
        ]);

        $sampai = isset($data['sampai']) ? Carbon::parse($data['sampai']) : Carbon::today();
        $dari = isset($data['dari'])
            ? Carbon::parse($data['dari'])
            : $sampai->copy()->startOfMonth();

        // Rentang dibatasi supaya satu permintaan tidak memindai bertahun data.
        if ($dari->diffInDays($sampai) > 92) {
            return ApiResponse::error('Rentang tanggal paling panjang 92 hari.', 422);
        }

        $anggota = User::query()
            ->with('department')
            ->where('is_active', true)
            ->when(
                ! $pengguna->canSeeAllDepartments(),
                // Supervisor terbatas pada departemennya, apa pun yang diminta.
                fn ($query) => $query->where('department_id', $pengguna->department_id),
                fn ($query) => $query->when(
                    isset($data['departemen_id']),
                    fn ($sub) => $sub->where('department_id', $data['departemen_id']),
                ),
            )
            ->when(
                isset($data['cari']),
                fn ($query) => $query->where('name', 'like', '%'.trim($data['cari']).'%'),
            )
            ->withCount([
                'laporan as jumlah_laporan' => fn ($query) => $query
                    ->whereBetween('report_date', [$dari, $sampai]),
                'laporan as jumlah_draf' => fn ($query) => $query
                    ->whereBetween('report_date', [$dari, $sampai])
                    ->where('status', DailyReport::STATUS_DRAF),
                'laporan as jumlah_ditinjau' => fn ($query) => $query
                    ->whereBetween('report_date', [$dari, $sampai])
                    ->where('status', DailyReport::STATUS_DITINJAU),
            ])
            ->orderBy('name')
            ->get();

        // Hari kerja dihitung sederhana: seluruh hari dalam rentang. Kalender
        // hari libur belum ada di sistem, dan menebaknya akan membuat angka
        // kepatuhan salah tanpa disadari.
        $jumlahHari = $dari->diffInDays($sampai) + 1;

        return ApiResponse::ok([
            'rentang' => [
                'dari' => $dari->toDateString(),
                'sampai' => $sampai->toDateString(),
                'jumlah_hari' => $jumlahHari,
            ],
            'anggota' => $anggota->map(fn (User $item) => [
                'id' => $item->id,
                'nama' => $item->name,
                'departemen' => $item->department?->name ?? '—',
                'jumlah_laporan' => $item->jumlah_laporan,
                'jumlah_draf' => $item->jumlah_draf,
                'jumlah_ditinjau' => $item->jumlah_ditinjau,
                'hari_tanpa_laporan' => max(0, $jumlahHari - $item->jumlah_laporan),
            ])->all(),
        ]);
    }
}
