<?php

namespace App\Http\Controllers;

use App\Support\Analitik\AngkaKepatuhan;
use App\Support\Analitik\AngkaProduktivitas;
use App\Support\Analitik\AngkaProgres;
use App\Support\Analitik\AngkaRingkasan;
use App\Support\Analitik\PenyaringAnalitik;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Executive Analytics.
 *
 * Empat halaman, empat endpoint — bukan satu balasan raksasa. Pembacanya
 * membuka satu halaman pada satu waktu, dan menghitung seluruhnya tiap kali
 * berarti menghitung tiga bagian yang tidak sedang dilihat siapa pun.
 *
 * ⚠️ Halaman ringkasan adalah jalur kebocoran data yang paling mudah terjadi.
 * Satu query yang lupa `visibleTo()` membuat pemegang jangkauan satu departemen
 * membaca angka seluruh perusahaan — dan tidak ada yang terlihat salah di layar.
 *
 * Penyaring departemen menambah jalur kedua yang sama berbahayanya: pengguna
 * mengirim `departemen_id` sendiri. Terjemahannya dipusatkan di
 * `PenyaringAnalitik`, yang membuang departemen di luar jangkauan sebelum satu
 * angka pun dihitung. `AnalitikTest` membuktikan keduanya.
 */
class AnalitikController extends Controller
{
    /**
     * Pilihan penyaring: departemen yang boleh dibaca dan metrik yang tersedia.
     *
     * Dipisah dari angkanya supaya layar dapat menyusun penyaringnya lebih dulu
     * tanpa menunggu hitungan apa pun selesai.
     */
    public function opsi(Request $request): JsonResponse
    {
        $saring = PenyaringAnalitik::dariPermintaan($request);

        return ApiResponse::ok([
            'departemen' => $saring->departemenTerjangkau()
                ->map(fn ($satu) => ['id' => $satu->id, 'nama' => $satu->name])
                ->values(),
            'metrik' => AngkaProduktivitas::metrikTersedia(),
            'batas_hari' => PenyaringAnalitik::BATAS_HARI,
        ]);
    }

    public function ringkasan(Request $request): JsonResponse
    {
        $saring = PenyaringAnalitik::dariPermintaan($request);

        return ApiResponse::ok([
            'rentang' => $saring->ringkas(),
            ...AngkaRingkasan::susun($saring),
        ]);
    }

    public function kepatuhan(Request $request): JsonResponse
    {
        $saring = PenyaringAnalitik::dariPermintaan($request);

        return ApiResponse::ok([
            'rentang' => $saring->ringkas(),
            ...AngkaKepatuhan::susun($saring),
        ]);
    }

    public function progres(Request $request): JsonResponse
    {
        $saring = PenyaringAnalitik::dariPermintaan($request);

        return ApiResponse::ok([
            'rentang' => $saring->ringkas(),
            ...AngkaProgres::susun($saring),
        ]);
    }

    /**
     * Angka dari isi laporan harian: kilogram, box, pouch.
     *
     * Metriknya dipilih pengguna. Tanpa pilihan, dipakai metrik pertama yang
     * tersedia — halaman yang terbuka kosong menuntut pengguna menebak apa yang
     * harus dipilih lebih dulu.
     */
    public function produktivitas(Request $request): JsonResponse
    {
        $saring = PenyaringAnalitik::dariPermintaan($request);

        $tersedia = AngkaProduktivitas::metrikTersedia();

        if ($tersedia === []) {
            return ApiResponse::ok([
                'rentang' => $saring->ringkas(),
                'metrik_tersedia' => [],
                'data' => null,
            ]);
        }

        $penanda = $request->string('metrik')->toString() ?: $tersedia[0]['penanda'];
        $data = AngkaProduktivitas::susun($saring, $penanda);

        if ($data === null) {
            return ApiResponse::error('Metrik tersebut tidak dikenal.', 422);
        }

        return ApiResponse::ok([
            'rentang' => $saring->ringkas(),
            'metrik_tersedia' => $tersedia,
            'data' => $data,
        ]);
    }
}
