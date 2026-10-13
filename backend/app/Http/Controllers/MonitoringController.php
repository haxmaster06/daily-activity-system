<?php

namespace App\Http\Controllers;

use App\Models\DailyReport;
use App\Models\User;
use App\Notifications\PengingatLaporan;
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
        // Izin dijaga middleware `izin:monitoring.lihat` pada rutenya.
        $pengguna = $request->user();
        $jangkauan = $pengguna->jangkauan();

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

        /*
         * Departemen di luar jangkauan ditolak, bukan diabaikan diam-diam.
         * Layarnya kini menampilkan pemilih departemen kepada pengguna yang
         * memantau lebih dari satu departemen, dan pemilih yang tampil tetapi
         * tidak berpengaruh lebih membingungkan daripada penolakan.
         */
        if (
            isset($data['departemen_id'])
            && ! $jangkauan->mencakupDepartemen((int) $data['departemen_id'])
        ) {
            return ApiResponse::error('Departemen tersebut di luar jangkauan Anda.', 403);
        }

        $anggota = User::query()
            ->with('department')
            ->wajibMelapor()
            ->when(
                ! $jangkauan->korporat(),
                fn ($query) => $query->whereIn('department_id', $jangkauan->departemenId),
            )
            ->when(
                isset($data['departemen_id']),
                fn ($query) => $query->where('department_id', $data['departemen_id']),
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
            /*
             * Dua penanda di bawah menentukan tombol "Kirim Pengingat", dan
             * sengaja dihitung untuk HARI INI — lepas dari rentang yang sedang
             * dilihat.
             *
             * Pengingatnya memang selalu tentang hari ini: PengingatController
             * memakai `Carbon::today()` bila tanggal tidak dikirim. Memagari
             * tombolnya dengan `jumlah_laporan` sepanjang rentang membuat
             * keduanya menjawab pertanyaan yang berbeda — dan sejak tanggal 2
             * tiap bulan tombolnya hanya muncul untuk orang yang belum melapor
             * sama sekali sebulan itu, sementara yang rajin melapor tapi hari
             * ini belum tidak pernah ditawari.
             *
             * Syaratnya ditulis persis sama dengan syarat yang menerima kiriman
             * di PengingatController, supaya tidak ada tombol yang tampil
             * tetapi penolakannya sudah pasti.
             */
            ->withExists([
                'laporan as sudah_melapor_hari_ini' => fn ($query) => $query
                    ->where('report_date', Carbon::today()->toDateString()),
                'notifications as sudah_diingatkan_hari_ini' => fn ($query) => $query
                    ->where('type', PengingatLaporan::class)
                    // `created_at` bertipe TIMESTAMP, jadi butuh rentang satu
                    // hari penuh — bukan perbandingan satu nilai.
                    ->whereBetween('created_at', [
                        Carbon::today()->startOfDay(),
                        Carbon::today()->endOfDay(),
                    ]),
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
                'sudah_melapor_hari_ini' => (bool) $item->sudah_melapor_hari_ini,
                'sudah_diingatkan_hari_ini' => (bool) $item->sudah_diingatkan_hari_ini,
            ])->all(),
        ]);
    }
}
