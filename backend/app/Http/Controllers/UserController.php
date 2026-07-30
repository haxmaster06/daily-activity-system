<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    /**
     * Daftar pengguna dengan pencarian dan penyaringan.
     *
     * Penyaringan dan pagination dikerjakan di server (standar §24.1,
     * non-fungsional §15.3). Relasi di-eager-load agar tidak N+1.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $pengguna = User::query()
            ->with(['role', 'department'])
            ->when($request->filled('cari'), function ($query) use ($request) {
                $kata = '%'.$request->string('cari')->trim().'%';
                $query->where(fn ($sub) => $sub
                    ->where('name', 'like', $kata)
                    ->orWhere('email', 'like', $kata));
            })
            ->when(
                $request->filled('departemen_id'),
                fn ($query) => $query->where('department_id', $request->integer('departemen_id')),
            )
            ->when(
                $request->filled('role'),
                fn ($query) => $query->whereHas(
                    'role',
                    fn ($sub) => $sub->where('slug', $request->string('role')),
                ),
            )
            ->when(
                $request->filled('status'),
                fn ($query) => $query->where('is_active', $request->string('status')->value() === 'aktif'),
            )
            ->orderBy('name')
            ->paginate(perPage: min($request->integer('per_halaman', 25), 100))
            ->withQueryString()
            ->through(fn (User $item) => new UserResource($item));

        return ApiResponse::paginated($pengguna);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $pengguna = User::create($request->validated());

        Audit::catat(
            Audit::AKSI_DIBUAT,
            Audit::MODUL_PENGGUNA,
            "Membuat pengguna {$pengguna->name}",
            $pengguna,
            // Kata sandi disaring otomatis oleh Audit.
            $request->validated(),
        );

        return ApiResponse::created(
            new UserResource($pengguna->load(['role', 'department'])),
            'Pengguna berhasil ditambahkan.',
        );
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $kolom = ['name', 'email', 'department_id', 'role_id'];
        $sebelum = $user->only($kolom);

        /*
         * Menurunkan role administrator terakhir akan membuat sistem tidak
         * lagi punya siapa pun yang bisa mengelola pengguna dan departemen —
         * termasuk untuk mengembalikan role tersebut.
         */
        if ($this->menghapusAdministratorTerakhir($user, (int) $request->validated('role_id'))) {
            return ApiResponse::error(
                'Ini administrator aktif terakhir. Angkat administrator lain terlebih dahulu '
                .'sebelum mengubah role akun ini.',
                422,
            );
        }

        $user->update($request->validated());

        $perubahan = Audit::selisih($sebelum, $user->only($kolom));

        if ($perubahan !== []) {
            Audit::catat(
                Audit::AKSI_DIPERBARUI,
                Audit::MODUL_PENGGUNA,
                "Memperbarui pengguna {$user->name}",
                $user,
                $perubahan,
            );
        }

        return ApiResponse::ok(
            new UserResource($user->load(['role', 'department'])),
            'Pengguna berhasil diperbarui.',
        );
    }

    /**
     * Mengaktifkan atau menonaktifkan akun.
     *
     * Pengguna tidak pernah dihapus — laporan yang sudah dibuat merujuk
     * padanya, dan riwayat aktivitas harus tetap utuh.
     */
    public function ubahStatus(Request $request, User $user): JsonResponse
    {
        $this->authorize('nonaktifkan', $user);

        $data = $request->validate(['aktif' => ['required', 'boolean']]);
        $aktif = (bool) $data['aktif'];

        if ($user->is_active === $aktif) {
            return ApiResponse::ok(
                new UserResource($user->load(['role', 'department'])),
                $aktif ? 'Pengguna sudah aktif.' : 'Pengguna sudah nonaktif.',
            );
        }

        /*
         * Sistem tidak boleh kehabisan administrator aktif. Di jalur ini
         * cukup dijaga oleh UserPolicy::nonaktifkan yang melarang
         * menonaktifkan diri sendiri: pelakunya pasti administrator yang
         * masih aktif, sehingga selalu tersisa minimal satu.
         *
         * Jalur yang benar-benar berisiko adalah penurunan role — dijaga di
         * `update()`.
         */
        $user->forceFill(['is_active' => $aktif])->save();

        if (! $aktif) {
            // Token yang sudah terbit ikut dicabut agar sesi berjalan berhenti.
            $user->tokens()->delete();
        }

        Audit::catat(
            $aktif ? Audit::AKSI_DIAKTIFKAN : Audit::AKSI_DINONAKTIFKAN,
            Audit::MODUL_PENGGUNA,
            ($aktif ? 'Mengaktifkan' : 'Menonaktifkan')." pengguna {$user->name}",
            $user,
        );

        return ApiResponse::ok(
            new UserResource($user->load(['role', 'department'])),
            $aktif ? 'Pengguna berhasil diaktifkan.' : 'Pengguna berhasil dinonaktifkan.',
        );
    }

    /**
     * Mengatur ulang kata sandi pengguna.
     *
     * Seluruh token pengguna dicabut agar sesi lama tidak melanjutkan akses
     * dengan kata sandi yang sudah tidak berlaku.
     */
    public function aturUlangKataSandi(Request $request, User $user): JsonResponse
    {
        $this->authorize('aturUlangKataSandi', $user);

        $data = $request->validate(
            ['password' => ['required', 'string', Password::min(8)]],
            attributes: ['password' => 'kata sandi'],
        );

        $user->forceFill(['password' => $data['password']])->save();
        $user->tokens()->delete();

        Audit::catat(
            Audit::AKSI_SANDI_DIATUR_ULANG,
            Audit::MODUL_PENGGUNA,
            "Mengatur ulang kata sandi {$user->name}",
            $user,
        );

        return ApiResponse::ok(null, 'Kata sandi berhasil diatur ulang.');
    }

    /**
     * Daftar role untuk mengisi pilihan pada form pengguna.
     */
    public function roles(): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        $roles = Role::orderBy('level')->get()->map(fn (Role $role) => [
            'id' => $role->id,
            'slug' => $role->slug,
            'nama' => $role->name,
        ]);

        return ApiResponse::ok($roles);
    }

    /**
     * Apakah perubahan role ini akan menghabiskan administrator aktif terakhir.
     */
    private function menghapusAdministratorTerakhir(User $user, int $roleBaruId): bool
    {
        if (! $user->isAdministrator() || ! $user->is_active) {
            return false;
        }

        $masihAdministrator = Role::whereKey($roleBaruId)
            ->where('slug', Role::ADMINISTRATOR)
            ->exists();

        if ($masihAdministrator) {
            return false;
        }

        return User::query()
            ->where('is_active', true)
            ->whereHas('role', fn ($query) => $query->where('slug', Role::ADMINISTRATOR))
            ->whereKeyNot($user->getKey())
            ->doesntExist();
    }
}
