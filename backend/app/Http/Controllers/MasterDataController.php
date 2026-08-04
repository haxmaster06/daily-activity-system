<?php

namespace App\Http\Controllers;

use App\Http\Requests\MasterDataRequest;
use App\Http\Resources\MasterDataResource;
use App\Models\MasterData;
use App\Models\MasterType;
use App\Support\ApiResponse;
use App\Support\Audit;
use App\Support\KodeOtomatis;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MasterDataController extends Controller
{
    /**
     * Isi satu daftar master, berpagination.
     *
     * Berbeda dari daftar jenis: sebuah daftar LOT dapat berisi ribuan baris,
     * sehingga memuatnya sekaligus melanggar non-fungsional §15.3.
     */
    public function index(Request $request, MasterType $jenis): JsonResponse
    {
        $this->authorize('viewAny', MasterData::class);

        $isi = $this->dasar($request, $jenis)
            ->with('induk')
            ->paginate(perPage: min($request->integer('per_halaman', 25), 100))
            ->withQueryString()
            ->through(fn (MasterData $baris) => new MasterDataResource($baris));

        return ApiResponse::paginated($isi);
    }

    /**
     * Pencarian untuk Combobox saat laporan diisi.
     *
     * Sengaja terpisah dari `index`: tidak berpagination, dibatasi jumlahnya,
     * dan hanya mengirim tiga kolom. Combobox tidak membutuhkan metadata
     * halaman, dan mengirimkan seluruh atribut tiap baris pada tiap ketikan
     * membuang jaringan tanpa alasan.
     *
     * Hanya baris aktif yang muncul. Baris nonaktif tetap tersimpan dan tetap
     * terbaca pada laporan lama — yang berubah hanya bahwa ia tidak lagi
     * ditawarkan untuk pengisian baru.
     */
    public function cari(Request $request, MasterType $jenis): JsonResponse
    {
        $this->authorize('viewAny', MasterData::class);

        $batas = min(max($request->integer('batas', 20), 1), 50);

        $isi = $this->dasar($request, $jenis)
            ->aktif()
            ->limit($batas)
            ->get(['id', 'code', 'name']);

        return ApiResponse::ok(
            $isi->map(fn (MasterData $baris) => [
                'id' => $baris->id,
                'kode' => $baris->code,
                'nama' => $baris->name,
            ])->all(),
        );
    }

    public function store(MasterDataRequest $request, MasterType $jenis): JsonResponse
    {
        $data = $request->validated();
        $data['master_type_id'] = $jenis->id;
        $data['code'] = KodeOtomatis::dariNama(
            $data['name'],
            MasterData::query()->where('master_type_id', $jenis->id),
            'code',
            48,
        );

        $baris = MasterData::create($data);

        Audit::catat(
            Audit::AKSI_DIBUAT,
            Audit::MODUL_MASTER,
            "Menambah {$baris->name} pada daftar {$jenis->name}",
            $baris,
            $data,
        );

        return ApiResponse::created(
            new MasterDataResource($baris->load('induk')),
            'Data berhasil ditambahkan.',
        );
    }

    public function update(MasterDataRequest $request, MasterType $jenis, MasterData $item): JsonResponse
    {
        $sebelum = $item->only(['name', 'parent_id', 'description', 'is_active', 'sort_order']);

        // `code` tidak ikut berubah — laporan lama menyimpan salinannya.
        $item->update($request->validated());

        $perubahan = Audit::selisih($sebelum, $item->only(array_keys($sebelum)));

        if ($perubahan !== []) {
            Audit::catat(
                Audit::AKSI_DIPERBARUI,
                Audit::MODUL_MASTER,
                "Memperbarui {$item->name} pada daftar {$jenis->name}",
                $item,
                $perubahan,
            );
        }

        return ApiResponse::ok(
            new MasterDataResource($item->load('induk')),
            'Data berhasil diperbarui.',
        );
    }

    /**
     * Menghapus satu baris daftar.
     *
     * Laporan yang sudah memakainya tidak diperiksa, dan itu disengaja: yang
     * tersimpan di laporan salinan `{kode, nama}`, bukan kunci asing, sehingga
     * tidak ada yang rusak. Yang ditolak hanya baris yang masih menjadi induk
     * baris lain — kunci asingnya memang menahan.
     */
    public function destroy(MasterType $jenis, MasterData $item): JsonResponse
    {
        $this->authorize('delete', $item);

        $jumlahTurunan = $item->turunan()->count();

        if ($jumlahTurunan > 0) {
            return ApiResponse::error(
                "{$item->name} masih menjadi induk bagi {$jumlahTurunan} data lain. "
                .'Hapus atau pindahkan data turunannya terlebih dahulu.',
                422,
            );
        }

        $nama = $item->name;
        $item->delete();

        Audit::catat(
            Audit::AKSI_DIHAPUS,
            Audit::MODUL_MASTER,
            "Menghapus {$nama} dari daftar {$jenis->name}",
        );

        return ApiResponse::ok(null, "{$nama} berhasil dihapus.");
    }

    /**
     * Penyaringan yang dipakai bersama `index` dan `cari`.
     *
     * @return Builder<MasterData>
     */
    private function dasar(Request $request, MasterType $jenis)
    {
        return MasterData::query()
            ->where('master_type_id', $jenis->id)
            ->when(
                $request->filled('cari') || $request->filled('q'),
                function ($query) use ($request): void {
                    $kata = '%'.trim((string) ($request->input('cari') ?? $request->input('q'))).'%';

                    $query->where(
                        fn ($sub) => $sub->where('name', 'like', $kata)->orWhere('code', 'like', $kata),
                    );
                },
            )
            /*
             * Penyaring induk inilah yang mewujudkan "Supplier menyempitkan
             * daftar LOT" (docs/standar-ui-ux.md §1.2).
             */
            ->when(
                $request->filled('induk_id'),
                fn ($query) => $query->where('parent_id', $request->integer('induk_id')),
            )
            ->when(
                $request->boolean('hanya_aktif'),
                fn ($query) => $query->aktif(),
            )
            ->orderBy('sort_order')
            ->orderBy('name');
    }
}
