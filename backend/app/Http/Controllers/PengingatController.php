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
        $pengirim = $request->user();

        // Deny by default: hanya Supervisor ke atas.
        if (! $pengirim->canMonitorTeam()) {
            return ApiResponse::error('Anda tidak memiliki akses ke tindakan ini.', 403);
        }

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

        // Supervisor terbatas pada departemennya sendiri, sama seperti Monitoring.
        if (
            ! $pengirim->canSeeAllDepartments()
            && $penerima->department_id !== $pengirim->department_id
        ) {
            return ApiResponse::error('Anggota ini berada di luar departemen Anda.', 403);
        }

        $sudahMelapor = DailyReport::query()
            ->where('user_id', $penerima->getKey())
            ->whereDate('report_date', $tanggal)
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
            ->whereDate('created_at', Carbon::today())
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
