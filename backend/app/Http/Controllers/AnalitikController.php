<?php

namespace App\Http\Controllers;

use App\Models\DailyReportItem;
use App\Models\ReportTemplate;
use App\Models\User;
use App\Support\Analitik\AngkaDepartemen;
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
     * Seluruh nilai yang dapat dijadikan penyaring.
     *
     * Dipisah dari angkanya supaya layar dapat menyusun penyaringnya lebih dulu
     * tanpa menunggu hitungan apa pun selesai.
     *
     * Daftarnya **tidak** ikut menyempit saat departemen sedang tersaring. Kalau
     * ikut menyempit, orang yang sudah terpilih lenyap dari daftar begitu
     * departemen lain dipilih, dan keping penyaringnya kehilangan nama —
     * tersaring oleh sesuatu yang tidak lagi dapat dibaca.
     */
    public function opsi(Request $request): JsonResponse
    {
        $saring = PenyaringAnalitik::dariPermintaan($request);
        $departemen = $saring->departemenTerjangkau();

        return ApiResponse::ok([
            'departemen' => $departemen
                ->map(fn ($satu) => ['id' => $satu->id, 'nama' => $satu->name])
                ->values(),
            'pengguna' => $saring->penggunaTerjangkau()
                ->map(fn (User $satu) => [
                    'id' => $satu->id,
                    'nama' => $satu->name,
                    'departemen' => $satu->department?->name ?? '—',
                ])
                ->values(),
            'template' => ReportTemplate::query()
                ->aktif()
                ->where(function ($query) use ($departemen): void {
                    // Template lintas departemen (`department_id` kosong) berlaku
                    // bagi semua orang, termasuk pemegang jangkauan satu
                    // departemen.
                    $query->whereNull('department_id')
                        ->orWhereIn('department_id', $departemen->pluck('id'));
                })
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get(['id', 'name', 'department_id'])
                ->map(fn (ReportTemplate $satu) => [
                    'id' => $satu->id,
                    'nama' => $satu->name,
                    'departemen_id' => $satu->department_id,
                ])
                ->values(),
            'status' => collect(DailyReportItem::LABEL_STATUS)
                ->map(fn (string $label, string $nilai) => ['nilai' => $nilai, 'label' => $label])
                ->values(),
            'metrik' => AngkaProduktivitas::metrikTersedia(),
            'batas_hari' => PenyaringAnalitik::BATAS_HARI,
        ]);
    }

    /**
     * Keadaan pekerjaan tiap departemen, dalam istilah departemen itu sendiri.
     *
     * Halaman yang paling sering dibuka seorang Direktur, dan satu-satunya yang
     * menjawab "sedang mengerjakan apa" alih-alih "seberapa rajin". Ringkasannya
     * dibangkitkan dari template masing-masing departemen — kolom Produksi
     * bicara kilogram dan LOT, kolom Exim bicara EMKL dan dokumen, dan keduanya
     * tidak bisa diseragamkan.
     */
    public function departemen(Request $request): JsonResponse
    {
        $saring = PenyaringAnalitik::dariPermintaan($request);

        return ApiResponse::ok([
            'rentang' => $saring->ringkas(),
            ...AngkaDepartemen::susun($saring),
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
