<?php

namespace App\Http\Controllers;

use App\Http\Requests\DepartmentRequest;
use App\Http\Resources\DepartmentResource;
use App\Models\Department;
use App\Support\ApiResponse;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    /**
     * Daftar departemen.
     *
     * Dipakai halaman manajemen departemen sekaligus pengisi pilihan
     * departemen pada form lain, sehingga jumlahnya tidak dipaginate —
     * master data ini hanya belasan baris.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Department::class);

        $departemen = Department::query()
            ->withCount('users')
            ->when(
                $request->boolean('hanya_aktif'),
                fn ($query) => $query->where('is_active', true),
            )
            ->when(
                $request->filled('cari'),
                fn ($query) => $query->where(function ($sub) use ($request) {
                    $kata = '%'.$request->string('cari')->trim().'%';
                    $sub->where('name', 'like', $kata)->orWhere('code', 'like', $kata);
                }),
            )
            ->orderBy('name')
            ->get();

        return ApiResponse::ok(DepartmentResource::collection($departemen));
    }

    public function store(DepartmentRequest $request): JsonResponse
    {
        $departemen = Department::create($request->validated());

        Audit::catat(
            Audit::AKSI_DIBUAT,
            Audit::MODUL_DEPARTEMEN,
            "Membuat departemen {$departemen->name}",
            $departemen,
            $request->validated(),
        );

        return ApiResponse::created(
            new DepartmentResource($departemen->loadCount('users')),
            'Departemen berhasil ditambahkan.',
        );
    }

    public function update(DepartmentRequest $request, Department $department): JsonResponse
    {
        $sebelum = $department->only(['code', 'name', 'description', 'is_active']);

        $department->update($request->validated());

        $perubahan = Audit::selisih($sebelum, $department->only(array_keys($sebelum)));

        if ($perubahan !== []) {
            Audit::catat(
                Audit::AKSI_DIPERBARUI,
                Audit::MODUL_DEPARTEMEN,
                "Memperbarui departemen {$department->name}",
                $department,
                $perubahan,
            );
        }

        return ApiResponse::ok(
            new DepartmentResource($department->loadCount('users')),
            'Departemen berhasil diperbarui.',
        );
    }

    /**
     * Menghapus departemen.
     *
     * Departemen yang masih punya anggota tidak dihapus — laporan lama
     * merujuk padanya. Pengguna diarahkan menonaktifkannya saja.
     */
    public function destroy(Department $department): JsonResponse
    {
        $this->authorize('delete', $department);

        $jumlahAnggota = $department->users()->count();

        if ($jumlahAnggota > 0) {
            return ApiResponse::error(
                "Departemen {$department->name} masih memiliki {$jumlahAnggota} anggota. "
                .'Pindahkan anggotanya terlebih dahulu, atau nonaktifkan departemen ini.',
                422,
            );
        }

        $nama = $department->name;
        $department->delete();

        Audit::catat(
            Audit::AKSI_DIHAPUS,
            Audit::MODUL_DEPARTEMEN,
            "Menghapus departemen {$nama}",
        );

        return ApiResponse::ok(null, 'Departemen berhasil dihapus.');
    }
}
