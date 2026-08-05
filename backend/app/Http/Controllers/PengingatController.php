<?php

namespace App\Http\Controllers;

use App\Models\DailyReport;
use App\Models\User;
use App\Notifications\PengingatLaporan;
use App\Support\ApiResponse;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PengingatController extends Controller
{
    /**
     * Mengirim pengingat laporan kepada satu anggota tim.
     *
     * Dipicu supervisor dari halaman Monitoring. Pengiriman otomatis sengaja
     * tidak dibuat: yang tahu seseorang sedang cuti, sakit, atau bertugas di
     * luar adalah atasannya, bukan penjadwal.
     */
    public function __invoke(Request $request): JsonResponse
    {
        // Izin dijaga middleware `izin:monitoring.kirim-pengingat` pada rutenya.
        $pengirim = $request->user();

        $data = $request->validate([
            'pengguna_id' => ['required', 'integer', 'exists:users,id'],
            'tanggal' => ['nullable', 'date'],
        ], attributes: [
            'pengguna_id' => 'anggota',
            'tanggal' => 'tanggal laporan',
        ]);

        $tanggal = isset($data['tanggal']) ? Carbon::parse($data['tanggal']) : Carbon::today();
        $penerima = User::findOrFail($data['pengguna_id']);

        if ($penerima->is($pengirim)) {
            return ApiResponse::error('Anda tidak dapat mengingatkan diri sendiri.', 422);
        }

        if (! $penerima->is_active) {
            return ApiResponse::error('Anggota ini sudah tidak aktif.', 422);
        }

        // Terbatas pada jangkauan datanya, sama seperti Monitoring.
        if (! $pengirim->jangkauan()->mencakupPengguna($penerima)) {
            return ApiResponse::error('Anggota ini berada di luar jangkauan Anda.', 403);
        }

        $sudahMelapor = DailyReport::query()
            ->where('user_id', $penerima->getKey())
            ->where('report_date', $tanggal)
            ->exists();

        if ($sudahMelapor) {
            return ApiResponse::error(
                $penerima->name.' sudah mengisi laporan untuk tanggal tersebut.',
                422,
            );
        }

        /*
         * Satu pengingat per orang per hari, dari siapa pun. Tanpa batas ini
         * seorang anggota dapat menerima belasan notifikasi yang sama dari
         * beberapa atasan pada hari yang sama.
         */
        $sudahDiingatkan = $penerima->notifications()
            ->where('type', PengingatLaporan::class)
            /*
             * `created_at` bertipe TIMESTAMP, bukan DATE, sehingga di sini
             * memang butuh rentang — bukan perbandingan satu nilai. Ditulis
             * sebagai rentang, bukan `whereDate()`, supaya kolomnya tetap dapat
             * dipakai index.
             */
            ->whereBetween('created_at', [
                Carbon::today()->startOfDay(),
                Carbon::today()->endOfDay(),
            ])
            ->exists();

        if ($sudahDiingatkan) {
            return ApiResponse::error(
                $penerima->name.' sudah menerima pengingat hari ini.',
                422,
            );
        }

        $penerima->notify(new PengingatLaporan($pengirim, $tanggal));

        Audit::catat(
            'pengingat_dikirim',
            Audit::MODUL_LAPORAN,
            sprintf(
                'Mengirim pengingat laporan %s kepada %s',
                $tanggal->translatedFormat('d F Y'),
                $penerima->name,
            ),
            $penerima,
        );

        return ApiResponse::ok(null, 'Pengingat dikirim kepada '.$penerima->name.'.');
    }
}
