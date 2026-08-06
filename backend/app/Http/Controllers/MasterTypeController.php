<?php

namespace App\Http\Controllers;

use App\Http\Requests\MasterTypeRequest;
use App\Http\Resources\MasterTypeResource;
use App\Models\MasterType;
use App\Models\TemplateField;
use App\Support\ApiResponse;
use App\Support\Audit;
use App\Support\KodeOtomatis;
use Illuminate\Http\JsonResponse;

class MasterTypeController extends Controller
{
    /**
     * Daftar jenis master.
     *
     * Tanpa pagination, mengikuti `DepartmentController`: jumlahnya belasan,
     * dan daftar ini juga mengisi pemilih pada layar lain.
     */
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', MasterType::class);

        $jenis = MasterType::query()
            ->with(['induk', 'departemenPengelola'])
            ->withCount('isi')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return ApiResponse::ok(MasterTypeResource::collection($jenis));
    }

    public function store(MasterTypeRequest $request): JsonResponse
    {
        $data = $request->validated();
        // Huruf kecil: slug ini muncul di alamat, mis. `/api/master/supplier`.
        $data['slug'] = KodeOtomatis::dariNama(
            $data['name'],
            MasterType::query(),
            'slug',
            32,
            hurufKecil: true,
        );

        $jenis = MasterType::create($data);
        $this->selaraskanPengelola($request, $jenis);

        Audit::catat(
            Audit::AKSI_DIBUAT,
            Audit::MODUL_MASTER,
            "Membuat daftar master {$jenis->name}",
            $jenis,
            $data,
        );

        return ApiResponse::created(
            new MasterTypeResource($jenis->load(['induk', 'departemenPengelola'])->loadCount('isi')),
            'Daftar master berhasil ditambahkan.',
        );
    }

    public function update(MasterTypeRequest $request, MasterType $jenis): JsonResponse
    {
        $sebelum = $jenis->only(['name', 'parent_type_id', 'description', 'sort_order']);

        // `slug` tidak ikut berubah — sudah menjadi rujukan kolom template (§1.3).
        $jenis->update($request->validated());
        $this->selaraskanPengelola($request, $jenis);

        $perubahan = Audit::selisih($sebelum, $jenis->only(array_keys($sebelum)));

        if ($perubahan !== []) {
            Audit::catat(
                Audit::AKSI_DIPERBARUI,
                Audit::MODUL_MASTER,
                "Memperbarui daftar master {$jenis->name}",
                $jenis,
                $perubahan,
            );
        }

        return ApiResponse::ok(
            new MasterTypeResource($jenis->load(['induk', 'departemenPengelola'])->loadCount('isi')),
            'Daftar master berhasil diperbarui.',
        );
    }

    /**
     * Menghapus jenis master beserta seluruh isinya.
     *
     * Isi ikut terhapus (cascade) dan itu memang disengaja: baris tanpa
     * daftarnya tidak punya arti. Laporan yang sudah tercatat tidak terpengaruh
     * karena yang tersimpan di sana salinan `{kode, nama}`, bukan kunci asing.
     *
     * Yang ditolak: jenis yang masih dirujuk kolom template, dan jenis yang masih
     * menjadi induk jenis lain — barisnya dipakai menyaring daftar turunannya.
     *
     * Tanda `is_system` TIDAK lagi menghalangi penghapusan. Tanda itu hanya
     * menyatakan bahwa daftarnya dibuat seeder, dan itu bukan alasan yang dapat
     * dijelaskan kepada administrator: perusahaan yang tidak memakai daftar
     * Produk berhak membuangnya. Yang benar-benar perlu dijaga adalah rujukan
     * yang masih hidup, dan itulah yang diperiksa di bawah.
     */
    public function destroy(MasterType $jenis): JsonResponse
    {
        $this->authorize('delete', $jenis);

        /*
         * Kunci asing `template_fields.master_type_id` memang RESTRICT,
         * sehingga basis data pun menahannya. Tetapi yang keluar dari sana
         * galat SQL mentah — pesan teknis tidak boleh sampai ke layar (standar
         * §25). Diperiksa lebih dulu supaya alasannya dapat dibaca, lengkap
         * dengan berapa kolom yang menahannya.
         */
        $jumlahKolom = TemplateField::where('master_type_id', $jenis->getKey())->count();

        if ($jumlahKolom > 0) {
            return ApiResponse::error(
                "Daftar {$jenis->name} masih dipakai {$jumlahKolom} kolom template. "
                .'Ubah kolom itu menjadi tipe lain terlebih dahulu.',
                422,
            );
        }

        $jumlahTurunan = $jenis->turunan()->count();

        if ($jumlahTurunan > 0) {
            return ApiResponse::error(
                "Daftar {$jenis->name} masih menjadi induk bagi {$jumlahTurunan} daftar lain. "
                .'Lepaskan induknya terlebih dahulu.',
                422,
            );
        }

        $nama = $jenis->name;
        $jumlahIsi = $jenis->isi()->count();

        $jenis->delete();

        Audit::catat(
            Audit::AKSI_DIHAPUS,
            Audit::MODUL_MASTER,
            "Menghapus daftar master {$nama}",
            null,
            ['isi_terhapus' => $jumlahIsi],
        );

        return ApiResponse::ok(null, "Daftar {$nama} berhasil dihapus.");
    }

    /**
     * Menyelaraskan daftar departemen pengelola, bila pemintanya berwenang.
     *
     * Dilewati diam-diam bagi yang tidak berwenang — bukan ditolak. Bidang ini
     * memang tidak tampil pada layar mereka, sehingga permintaannya tidak
     * pernah memuatnya; menolak seluruh permintaan hanya karena bidang yang
     * tidak mereka kirim akan menggagalkan penyuntingan nama yang sah.
     */
    private function selaraskanPengelola(MasterTypeRequest $request, MasterType $jenis): void
    {
        if (! $request->has('departemen_id')) {
            return;
        }

        if ($request->user()->cannot('aturPengelola', MasterType::class)) {
            return;
        }

        $jenis->departemenPengelola()->sync($request->validated('departemen_id', []));
    }
}
