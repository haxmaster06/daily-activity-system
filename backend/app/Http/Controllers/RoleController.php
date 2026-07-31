<?php

namespace App\Http\Controllers;

use App\Http\Requests\MatriksIzinRequest;
use App\Http\Requests\RoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\Permission;
use App\Models\Role;
use App\Support\ApiResponse;
use App\Support\Audit;
use App\Support\KatalogIzin;
use App\Support\KodeOtomatis;
use App\Support\PenjagaAkses;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class RoleController extends Controller
{
    /**
     * Daftar peran beserta hak aksesnya.
     *
     * Tanpa pagination: peran adalah master data yang jumlahnya belasan, dan
     * layar pengelolaannya perlu melihat semuanya sekaligus untuk
     * membandingkan hak akses antar peran.
     */
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Role::class);

        $peran = Role::query()
            ->with('permissions')
            ->withCount('users')
            /*
             * Bukan berdasarkan `level`. Peran buatan administrator selalu
             * ber-level 0, sehingga pengurutan lama akan menumpuk semuanya di
             * atas Staff.
             */
            ->orderByDesc('is_system')
            ->orderBy('name')
            ->get();

        return ApiResponse::ok(RoleResource::collection($peran));
    }

    /**
     * Katalog hak akses yang dapat dicentang, dikelompokkan untuk layar.
     */
    public function katalogIzin(): JsonResponse
    {
        $this->authorize('viewAny', Role::class);

        $izin = Permission::orderBy('sort_order')->get();

        $grup = collect(KatalogIzin::GRUP)->map(fn (string $nama, string $kunci) => [
            'kunci' => $kunci,
            'nama' => $nama,
            'izin' => $izin->where('group_key', $kunci)->map(fn (Permission $satu) => [
                'kunci' => $satu->key,
                'nama' => $satu->name,
                'keterangan' => $satu->description,
            ])->values()->all(),
        ])->values();

        return ApiResponse::ok($grup);
    }

    /**
     * Menyimpan perubahan hak akses beberapa peran sekaligus.
     *
     * Layar pengelolaan berbentuk matriks: baris hak akses, kolom peran. Satu
     * kali simpan dapat menyentuh beberapa peran, dan semuanya harus berhasil
     * bersama. Menyimpan per peran membuat sebagian perubahan tersimpan lalu
     * sisanya ditolak penjaga akses — keadaan yang tidak diminta siapa pun dan
     * sulit dipulihkan dari layar.
     */
    public function simpanMatriks(MatriksIzinRequest $request): JsonResponse
    {
        $perubahan = $request->validated('perubahan');

        PenjagaAkses::jalankan(function () use ($perubahan): void {
            foreach ($perubahan as $satu) {
                $peran = Role::findOrFail($satu['role_id']);
                $sebelum = $peran->permissions->pluck('key')->sort()->values()->all();

                $peran->permissions()->sync($this->idIzin($satu['izin'] ?? []));
                $peran->load('permissions');

                $sesudah = $peran->permissions->pluck('key')->sort()->values()->all();

                if ($sebelum === $sesudah) {
                    continue;
                }

                Audit::catat(
                    Audit::AKSI_DIPERBARUI,
                    Audit::MODUL_PENGGUNA,
                    "Mengubah hak akses peran {$peran->name}",
                    $peran,
                    ['izin' => ['sebelum' => $sebelum, 'sesudah' => $sesudah]],
                );
            }
        });

        $peran = Role::query()
            ->with('permissions')
            ->withCount('users')
            ->orderByDesc('is_system')
            ->orderBy('name')
            ->get();

        return ApiResponse::ok(RoleResource::collection($peran), 'Hak akses berhasil disimpan.');
    }

    public function store(RoleRequest $request): JsonResponse
    {
        $data = $request->validated();

        $peran = Role::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'scope_level_default' => $data['scope_level_default'] ?? null,

            /*
             * Slug diturunkan dari nama, tidak pernah diketik — sekali dibuat
             * ia menjadi pengenal tetap peran itu. Dihurufkecilkan agar sebentuk
             * dengan slug bawaan (`staff`, `supervisor`); pemeriksaan kembar di
             * dalam `dariNama` tetap sah karena perbandingan MySQL tidak
             * membedakan besar kecil huruf.
             */
            'slug' => Str::lower(KodeOtomatis::dariNama($data['name'], Role::query(), 'slug')),

            /*
             * Kolom lama, NOT NULL tanpa default. Tidak ada lagi kode yang
             * membacanya; nol menandai peran yang tidak berasal dari tangga
             * level lama.
             */
            'level' => 0,
        ]);

        $peran->permissions()->sync($this->idIzin($data['izin']));

        Audit::catat(
            Audit::AKSI_DIBUAT,
            Audit::MODUL_PENGGUNA,
            "Membuat peran {$peran->name}",
            $peran,
            ['nama' => $peran->name, 'izin' => $data['izin']],
        );

        return ApiResponse::created(
            new RoleResource($peran->load('permissions')->loadCount('users')),
            'Peran berhasil ditambahkan.',
        );
    }

    public function update(RoleRequest $request, Role $role): JsonResponse
    {
        $data = $request->validated();
        $sebelum = [
            'nama' => $role->name,
            'keterangan' => $role->description,
            'izin' => $role->permissions->pluck('key')->sort()->values()->all(),
        ];

        PenjagaAkses::jalankan(function () use ($role, $data): void {
            /*
             * Slug peran bawaan tidak ikut berubah walau namanya diperbaiki:
             * seeder, factory, dan penjaga akses merujuk padanya.
             */
            $role->update([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'scope_level_default' => $data['scope_level_default'] ?? null,
            ]);

            $role->permissions()->sync($this->idIzin($data['izin']));
            $role->load('permissions');
        });

        $perubahan = Audit::selisih($sebelum, [
            'nama' => $role->name,
            'keterangan' => $role->description,
            'izin' => $role->permissions->pluck('key')->sort()->values()->all(),
        ]);

        if ($perubahan !== []) {
            Audit::catat(
                Audit::AKSI_DIPERBARUI,
                Audit::MODUL_PENGGUNA,
                "Memperbarui peran {$role->name}",
                $role,
                $perubahan,
            );
        }

        return ApiResponse::ok(
            new RoleResource($role->loadCount('users')),
            'Peran berhasil diperbarui.',
        );
    }

    /**
     * Menghapus peran.
     *
     * Peran bawaan ditolak Policy. Peran yang masih dipakai ditolak di sini,
     * dengan menyebut jumlah pemakainya — sama seperti departemen.
     */
    public function destroy(Role $role): JsonResponse
    {
        $this->authorize('delete', $role);

        $jumlah = $role->users()->count();

        if ($jumlah > 0) {
            return ApiResponse::error(
                "Peran {$role->name} masih dipakai {$jumlah} pengguna. "
                .'Pindahkan pengguna tersebut ke peran lain terlebih dahulu.',
                422,
            );
        }

        $nama = $role->name;

        PenjagaAkses::jalankan(fn () => $role->delete());

        Audit::catat(
            Audit::AKSI_DIHAPUS,
            Audit::MODUL_PENGGUNA,
            "Menghapus peran {$nama}",
        );

        return ApiResponse::ok(null, 'Peran berhasil dihapus.');
    }

    /**
     * @param  array<int, string>  $kunci
     * @return array<int, int>
     */
    private function idIzin(array $kunci): array
    {
        return Permission::whereIn('key', $kunci)->pluck('id')->all();
    }
}
