<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\Attachment;
use App\Models\DailyReport;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\Audit;
use App\Support\PenjagaAkses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
            // Dipakai menentukan akun mana yang masih dapat dihapus.
            ->withCount(['laporan', 'lampiran'])
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
                // Menyaring lewat penetapan, bukan kolom cermin: seseorang
                // dapat memegang beberapa peran sekaligus.
                $request->filled('role'),
                fn ($query) => $query->whereHas(
                    'roles',
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
        $pengguna = PenjagaAkses::jalankan(function () use ($request) {
            $pengguna = User::create($request->atributPengguna());
            $pengguna->syncRoles($request->penetapan());

            return $pengguna;
        });

        Audit::catat(
            Audit::AKSI_DIBUAT,
            Audit::MODUL_PENGGUNA,
            "Membuat pengguna {$pengguna->name}",
            $pengguna,
            // Kata sandi disaring otomatis oleh Audit.
            [...$request->atributPengguna(), 'penetapan' => $request->penetapan()],
        );

        return ApiResponse::created(
            new UserResource($pengguna->load(['role', 'department'])),
            'Pengguna berhasil ditambahkan.',
        );
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $kolom = ['name', 'email', 'department_id', 'role_id'];
        $sebelum = [...$user->only($kolom), 'penetapan' => $this->ringkasPenetapan($user)];

        /*
         * Penjaga dipasang mengelilingi perubahan, bukan menebaknya lebih dulu:
         * mengubah penetapan peran dapat menghabiskan satu-satunya akun yang
         * mampu mengembalikannya.
         */
        PenjagaAkses::jalankan(function () use ($request, $user): void {
            $user->update($request->atributPengguna());

            if ($request->menyertakanPenetapan()) {
                $user->syncRoles($request->penetapan());
            }
        });

        $perubahan = Audit::selisih(
            $sebelum,
            [...$user->only($kolom), 'penetapan' => $this->ringkasPenetapan($user)],
        );

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
     * Mengatur penetapan peran seorang pengguna.
     *
     * Terpisah dari penyuntingan identitas karena bentuknya berbeda: kumpulan
     * baris yang jumlahnya berubah-ubah, bukan sekumpulan kolom tetap.
     */
    public function aturPenetapan(PenetapanRoleRequest $request, User $user): JsonResponse
    {
        $sebelum = $this->ringkasPenetapan($user);

        PenjagaAkses::jalankan(fn () => $user->syncRoles($request->penetapan()));

        $sesudah = $this->ringkasPenetapan($user);

        if ($sebelum !== $sesudah) {
            Audit::catat(
                Audit::AKSI_DIPERBARUI,
                Audit::MODUL_PENGGUNA,
                "Mengubah penetapan peran {$user->name}",
                $user,
                ['penetapan' => ['sebelum' => $sebelum, 'sesudah' => $sesudah]],
            );
        }

        return ApiResponse::ok(
            new UserResource($user->load(['role', 'department'])),
            'Penetapan peran berhasil disimpan.',
        );
    }

    /**
     * Menghapus akun permanen.
     *
     * Hanya akun yang belum meninggalkan jejak. Yang sudah punya laporan
     * ditolak di sini dengan pesan yang mengarahkan ke penonaktifan — kunci
     * asing memang akan menolaknya juga, tetapi galat basis data bukan jawaban
     * yang dapat dipahami pengguna.
     */
    public function destroy(User $user): JsonResponse
    {
        if ($user->is_system) {
            return ApiResponse::error(
                "{$user->name} adalah akun administrator awal dan tidak dapat dihapus. "
                .'Akun ini satu-satunya jalan masuk bila tidak ada akun lain yang tersisa.',
                422,
            );
        }

        $this->authorize('delete', $user);

        $nama = $user->name;
        $email = $user->email;
        $jumlahLaporan = $user->laporan()->count();
        $jumlahLampiran = $user->lampiran()->count();

        PenjagaAkses::jalankan(function () use ($user): void {
            /*
             * Berkas lampiran dihapus lebih dulu, selagi barisnya masih ada.
             * Baris di basis data ikut terhapus sendiri karena `attachments`
             * cascade dari laporannya, tetapi berkas di disk tidak — dan
             * berkas yatim tidak pernah ada yang membersihkannya.
             */
            foreach ($user->lampiran()->pluck('path') as $jalur) {
                Storage::disk('local')->delete($jalur);
            }

            foreach (
                Attachment::whereIn('daily_report_id', $user->laporan()->select('id'))
                    ->pluck('path') as $jalur
            ) {
                Storage::disk('local')->delete($jalur);
            }

            // Lampiran yang diunggahnya pada laporan orang lain: kunci asing
            // `uploaded_by` menahan penghapusan akun selama barisnya ada.
            $user->lampiran()->delete();

            // Laporan menyeret bagian, baris isian, dan lampirannya sendiri.
            $user->laporan()->each(fn (DailyReport $laporan) => $laporan->delete());

            /*
             * Token dan notifikasi memakai relasi morph tanpa kunci asing,
             * sehingga tidak ikut terhapus sendiri. Membiarkannya berarti
             * meninggalkan token yang masih dapat dipakai.
             */
            $user->tokens()->delete();
            $user->notifications()->delete();

            $user->delete();
        });

        /*
         * Jejak audit tetap utuh: `audit_logs.user_id` menjadi null, tetapi
         * `user_name` sudah disimpan terpisah sejak awal. Jumlah yang ikut
         * terhapus dicatat — inilah satu-satunya sisa buktinya.
         */
        Audit::catat(
            Audit::AKSI_DIHAPUS,
            Audit::MODUL_PENGGUNA,
            "Menghapus pengguna {$nama} ({$email})",
            null,
            ['laporan_terhapus' => $jumlahLaporan, 'lampiran_terhapus' => $jumlahLampiran],
        );

        return ApiResponse::ok(null, "Pengguna {$nama} berhasil dihapus.");
    }

    /**
     * Bentuk ringkas penetapan peran untuk pembanding jejak audit.
     *
     * @return array<int, string>
     */
    private function ringkasPenetapan(User $user): array
    {
        return $user->roles
            ->map(fn ($peran) => $peran->slug.':'.$peran->pivot->scope_level
                .':'.($peran->pivot->department_id ?? '-'))
            ->sort()
            ->values()
            ->all();
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
         * Larangan menonaktifkan diri sendiri di UserPolicy dulu cukup: siapa
         * pun yang sampai ke sini pasti administrator aktif, sehingga selalu
         * tersisa satu.
         *
         * Alasan itu berhenti berlaku sejak wewenang dapat dipecah. Peran yang
         * hanya memegang izin menonaktifkan — tanpa izin mengelola pengguna —
         * dapat menonaktifkan pemegang terakhir izin pengelolaan, lalu tidak
         * ada lagi yang bisa memulihkannya.
         */
        PenjagaAkses::jalankan(function () use ($user, $aktif): void {
            $user->forceFill(['is_active' => $aktif])->save();

            if (! $aktif) {
                // Token yang sudah terbit ikut dicabut agar sesi berjalan berhenti.
                $user->tokens()->delete();
            }
        });

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
}
