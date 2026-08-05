<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportBerkasRequest;
use App\Models\DailyReport;
use App\Models\ReportTemplate;
use App\Support\ApiResponse;
use App\Support\Audit;
use App\Support\ImportLaporan;
use App\Support\TemplateImportLaporan;
use App\Support\ValidasiIsianTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Unduh template dan import laporan harian.
 *
 * Preview-first, sama seperti export dan import daftar master. Pratinjau
 * memakai pemeriksaan yang sama persis dengan penyimpanan.
 *
 * Laporan yang dibuat selalu milik pengunggahnya sendiri, dan selalu berstatus
 * draf. Membiarkan berkas membuat laporan atas nama orang lain berarti
 * membangun jalan memutar untuk mengisi laporan orang lain; membiarkannya
 * langsung berstatus terkirim berarti melewati langkah pemeriksaan yang
 * justru menjadi alasan tombol Kirim ada.
 */
class ImportLaporanController extends Controller
{
    public function template(Request $request, ReportTemplate $template): StreamedResponse|JsonResponse
    {
        $this->authorize('create', DailyReport::class);

        if ($galat = $this->tolakTemplateAsing($request, $template)) {
            return $galat;
        }

        $lembar = TemplateImportLaporan::untuk($template->load('fields'));
        $namaBerkas = 'Template Import '.$template->name.' '.now()->format('Ymd').'.xlsx';

        return response()->streamDownload(function () use ($lembar): void {
            (new Xlsx($lembar))->save('php://output');
        }, $namaBerkas, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function pratinjau(ImportBerkasRequest $request, ReportTemplate $template): JsonResponse
    {
        if ($galat = $this->tolakTemplateAsing($request, $template)) {
            return $galat;
        }

        $hasil = ImportLaporan::periksa(
            $request->file('berkas'),
            $template->load('fields'),
            $request->user(),
        );

        return ApiResponse::ok([
            'template' => ['id' => $template->id, 'nama' => $template->name],
            ...$hasil,
        ]);
    }

    /**
     * Menyimpan isi berkas sebagai laporan draf, satu laporan per tanggal.
     *
     * Seluruhnya di dalam satu transaksi. Berkas berisi dua puluh tanggal yang
     * gagal di tanggal kesepuluh meninggalkan separuh laporan tersimpan, dan
     * pengunggahnya tidak punya cara mengetahui separuh yang mana.
     */
    public function simpan(ImportBerkasRequest $request, ReportTemplate $template): JsonResponse
    {
        if ($galat = $this->tolakTemplateAsing($request, $template)) {
            return $galat;
        }

        $pengguna = $request->user();
        $template->load('fields');

        $hasil = ImportLaporan::periksa($request->file('berkas'), $template, $pengguna);

        $diterima = array_filter(
            $hasil['baris'],
            fn (array $satu) => $satu['tindakan'] === ImportLaporan::TINDAKAN_DITERIMA,
        );

        if ($diterima === []) {
            return ApiResponse::error(
                'Tidak ada baris yang dapat disimpan. Perbaiki berkasnya lalu unggah ulang.',
                422,
            );
        }

        $jumlah = DB::transaction(function () use ($diterima, $template, $pengguna): array {
            $perTanggal = [];

            foreach ($diterima as $baris) {
                $perTanggal[$baris['tanggal']][] = $baris['nilai'];
            }

            ksort($perTanggal);

            $laporan = 0;
            $barisTersimpan = 0;

            foreach ($perTanggal as $tanggal => $isi) {
                $catatan = DailyReport::create([
                    'user_id' => $pengguna->getKey(),
                    // Disalin, bukan dibaca lewat relasi: pengguna dapat
                    // dipindah departemen, dan laporan lama harus tetap
                    // tercatat di tempat asalnya.
                    'department_id' => $pengguna->department_id,
                    'report_date' => $tanggal,
                    'status' => DailyReport::STATUS_DRAF,
                ]);

                $bagian = $catatan->sections()->create([
                    'report_template_id' => $template->id,
                    'sort_order' => 0,
                ]);

                foreach (array_values($isi) as $urutan => $nilai) {
                    /*
                     * Lewat `bersihkan()` yang sama dengan pengisian layar:
                     * kolom hitungan diisi server, dan kunci asing yang tidak
                     * dikenal template dibuang.
                     */
                    $bersih = ValidasiIsianTemplate::bersihkan($template, $nilai);

                    $bagian->items()->create([
                        'data' => $bersih,
                        'progress_status' => ValidasiIsianTemplate::statusBaris($template, $bersih),
                        'sort_order' => $urutan,
                    ]);

                    $barisTersimpan++;
                }

                $laporan++;
            }

            return ['laporan' => $laporan, 'baris' => $barisTersimpan];
        });

        Audit::catat(
            Audit::AKSI_DIBUAT,
            Audit::MODUL_LAPORAN,
            "Mengimpor laporan {$template->name}",
            null,
            [
                'laporan' => $jumlah['laporan'],
                'baris' => $jumlah['baris'],
                'ditolak' => $hasil['ringkasan']['ditolak'],
            ],
        );

        return ApiResponse::ok(
            $jumlah,
            sprintf(
                '%d laporan draf dibuat dari %d baris, %d baris dilewati.',
                $jumlah['laporan'],
                $jumlah['baris'],
                $hasil['ringkasan']['ditolak'],
            ),
        );
    }

    /**
     * Menolak template milik departemen lain.
     *
     * Aturan yang sama sudah ditegakkan `DailyReportController::simpanBagian()`.
     * Tanpa ini, import menjadi jalan memutar untuk mengisi laporan memakai
     * bentuk tabel departemen lain.
     */
    private function tolakTemplateAsing(Request $request, ReportTemplate $template): ?JsonResponse
    {
        $pengguna = $request->user();

        if (
            $template->department_id !== null
            && $template->department_id !== $pengguna->department_id
        ) {
            return ApiResponse::error('Template tersebut bukan milik departemen Anda.', 403);
        }

        if (! $template->is_active) {
            return ApiResponse::error('Template tersebut sudah tidak aktif.', 422);
        }

        return null;
    }
}
