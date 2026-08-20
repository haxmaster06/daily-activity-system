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
     * Mengirim pengingat laporan kepada satu atau beberapa anggota sekaligus.
     *
     * Dipicu supervisor dari halaman Monitoring. Pengiriman otomatis sengaja
     * tidak dibuat: yang tahu seseorang sedang cuti, sakit, atau bertugas di
     * luar adalah atasannya, bukan penjadwal.
     *
     * `pengguna_id` selalu berupa array — pengiriman ke satu orang adalah array
     * berisi satu id. Tiap penerima dijaga aturan yang persis sama, dan yang tak
     * memenuhi dilewati dengan alasannya, bukan menggagalkan seluruh kiriman.
     */
    public function __invoke(Request $request): JsonResponse
    {
        // Izin dijaga middleware `izin:monitoring.kirim-pengingat` pada rutenya.
        $pengirim = $request->user();

        $data = $request->validate([
            'pengguna_id' => ['required', 'array', 'min:1'],
            'pengguna_id.*' => ['integer', 'exists:users,id'],
            'tanggal' => ['nullable', 'date'],
        ], attributes: [
            'pengguna_id' => 'anggota',
            'pengguna_id.*' => 'anggota',
            'tanggal' => 'tanggal laporan',
        ]);

        $tanggal = isset($data['tanggal']) ? Carbon::parse($data['tanggal']) : Carbon::today();
        $ids = collect($data['pengguna_id'])->map(fn ($nilai) => (int) $nilai)->unique();

        $terkirim = [];
        $dilewati = [];

        foreach (User::whereIn('id', $ids)->get() as $penerima) {
            $alasan = $this->alasanTakDapat($pengirim, $penerima, $tanggal);

            if ($alasan !== null) {
                $dilewati[] = ['nama' => $penerima->name, 'alasan' => $alasan];

                continue;
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

            $terkirim[] = $penerima->name;
        }

        return ApiResponse::ok(
            ['terkirim' => count($terkirim), 'dilewati' => $dilewati],
            $this->pesan($terkirim, $dilewati),
        );
    }

    /**
     * Alasan seseorang tak dapat diingatkan, atau null bila bisa. Satu tempat
     * agar kiriman tunggal dan massal memakai aturan yang persis sama.
     */
    private function alasanTakDapat(User $pengirim, User $penerima, Carbon $tanggal): ?string
    {
        if ($penerima->is($pengirim)) {
            return 'tidak dapat mengingatkan diri sendiri';
        }

        if (! $penerima->is_active) {
            return 'sudah tidak aktif';
        }

        // Terbatas pada jangkauan datanya, sama seperti Monitoring.
        if (! $pengirim->jangkauan()->mencakupPengguna($penerima)) {
            return 'di luar jangkauan Anda';
        }

        $sudahMelapor = DailyReport::query()
            ->where('user_id', $penerima->getKey())
            ->where('report_date', $tanggal)
            ->exists();

        if ($sudahMelapor) {
            return 'sudah mengisi laporan';
        }

        /*
         * Satu pengingat per orang per hari, dari siapa pun. Tanpa batas ini
         * seorang anggota dapat menerima belasan notifikasi yang sama dari
         * beberapa atasan pada hari yang sama.
         *
         * `created_at` bertipe TIMESTAMP, jadi memang butuh rentang — ditulis
         * sebagai rentang, bukan `whereDate()`, supaya kolomnya tetap ter-index.
         */
        $sudahDiingatkan = $penerima->notifications()
            ->where('type', PengingatLaporan::class)
            ->whereBetween('created_at', [Carbon::today()->startOfDay(), Carbon::today()->endOfDay()])
            ->exists();

        if ($sudahDiingatkan) {
            return 'sudah menerima pengingat hari ini';
        }

        return null;
    }

    /**
     * @param  list<string>  $terkirim
     * @param  list<array{nama: string, alasan: string}>  $dilewati
     */
    private function pesan(array $terkirim, array $dilewati): string
    {
        $n = count($terkirim);
        $m = count($dilewati);

        if ($n === 0) {
            // Kiriman ke satu orang: sebut alasannya langsung, lebih jelas.
            if ($m === 1) {
                return ucfirst($dilewati[0]['nama'].' '.$dilewati[0]['alasan']).'.';
            }

            return 'Tidak ada pengingat yang dikirim — semua anggota terlewati.';
        }

        $inti = $n === 1
            ? 'Pengingat dikirim kepada '.$terkirim[0].'.'
            : "Pengingat dikirim kepada {$n} anggota.";

        return $m > 0 ? $inti." {$m} anggota dilewati." : $inti;
    }
}
