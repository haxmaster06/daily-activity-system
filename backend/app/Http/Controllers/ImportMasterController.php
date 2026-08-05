<?php

namespace App\Http\Controllers;

use App\Http\Requests\ImportBerkasRequest;
use App\Models\MasterData;
use App\Models\MasterType;
use App\Support\ApiResponse;
use App\Support\Audit;
use App\Support\ImportMaster;
use App\Support\KodeOtomatis;
use App\Support\TemplateImportMaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Unduh template dan import daftar master.
 *
 * Alurnya preview-first, sama seperti export — dan itu memang standar project
 * ini, bukan pilihan (`docs/standar-ui-ux.md` §9). Pratinjau memakai
 * pemeriksaan yang sama persis dengan penyimpanan, sehingga yang dilihat
 * pengguna benar-benar yang akan tersimpan.
 */
class ImportMasterController extends Controller
{
    /**
     * Template `.xlsx` yang siap diisi.
     *
     * Diberikan kepada siapa pun yang boleh membaca daftarnya. Isinya bukan
     * data — hanya judul kolom, dua baris contoh buatan, dan petunjuk.
     */
    public function template(MasterType $jenis): StreamedResponse
    {
        $this->authorize('viewAny', MasterData::class);

        $lembar = TemplateImportMaster::untuk($jenis);
        $namaBerkas = 'Template Import '.$jenis->name.' '.now()->format('Ymd').'.xlsx';

        return response()->streamDownload(function () use ($lembar): void {
            (new Xlsx($lembar))->save('php://output');
        }, $namaBerkas, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Memeriksa berkas tanpa menulis apa pun.
     *
     * Tidak ada satu pun query tulis di jalur ini. Itu yang membuat pengguna
     * dapat mengunggah berkas apa pun untuk sekadar melihat isinya dinilai.
     */
    public function pratinjau(ImportBerkasRequest $request, MasterType $jenis): JsonResponse
    {
        $hasil = ImportMaster::periksa($request->file('berkas'), $jenis);

        return ApiResponse::ok([
            'jenis' => ['slug' => $jenis->slug, 'nama' => $jenis->name],
            ...$hasil,
        ]);
    }

    /**
     * Menyimpan isi berkas.
     *
     * Seluruhnya di dalam satu transaksi: berkas dua ribu baris yang gagal di
     * tengah jalan meninggalkan separuh data tersimpan, dan pengguna tidak
     * punya cara mengetahui separuh yang mana.
     *
     * Baris yang ditolak **dilewati**, bukan menggagalkan seluruh berkas —
     * pratinjau sudah menunjukkan baris mana saja itu, dan pengguna yang tetap
     * menekan Simpan sudah memutuskan untuk menerimanya.
     */
    public function simpan(ImportBerkasRequest $request, MasterType $jenis): JsonResponse
    {
        $hasil = ImportMaster::periksa($request->file('berkas'), $jenis);

        $tersimpan = DB::transaction(function () use ($hasil, $jenis): array {
            $baru = 0;
            $diperbarui = 0;

            foreach ($hasil['baris'] as $baris) {
                if ($baris['tindakan'] === ImportMaster::TINDAKAN_DITOLAK) {
                    continue;
                }

                if ($baris['tindakan'] === ImportMaster::TINDAKAN_PERBARUI) {
                    $data = MasterData::find($baris['id']);

                    if ($data === null) {
                        continue;
                    }

                    /*
                     * Kode sengaja tidak ikut diperbarui. Laporan lama
                     * menyimpan salinan `{kode, nama}`, dan kode adalah
                     * satu-satunya penanda yang menyambungkan keduanya (§1.5).
                     */
                    $data->update([
                        'name' => $baris['nama'],
                        'parent_id' => $baris['induk_id'],
                        'description' => $baris['keterangan'],
                        'is_active' => $baris['aktif'],
                    ]);

                    $diperbarui++;

                    continue;
                }

                MasterData::create([
                    'master_type_id' => $jenis->id,
                    'code' => KodeOtomatis::dariNama(
                        $baris['nama'],
                        MasterData::where('master_type_id', $jenis->id),
                    ),
                    'name' => $baris['nama'],
                    'parent_id' => $baris['induk_id'],
                    'description' => $baris['keterangan'],
                    'is_active' => $baris['aktif'],
                ]);

                $baru++;
            }

            return ['baru' => $baru, 'diperbarui' => $diperbarui];
        });

        Audit::catat(
            Audit::AKSI_DIBUAT,
            Audit::MODUL_MASTER,
            "Mengimpor daftar {$jenis->name}",
            null,
            [
                'ditambahkan' => $tersimpan['baru'],
                'diperbarui' => $tersimpan['diperbarui'],
                'ditolak' => $hasil['ringkasan']['ditolak'],
            ],
        );

        return ApiResponse::ok(
            $tersimpan,
            sprintf(
                '%d data ditambahkan, %d diperbarui, %d dilewati.',
                $tersimpan['baru'],
                $tersimpan['diperbarui'],
                $hasil['ringkasan']['ditolak'],
            ),
        );
    }
}
