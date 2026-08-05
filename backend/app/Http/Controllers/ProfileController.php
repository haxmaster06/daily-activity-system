<?php

namespace App\Http\Controllers;

use App\Http\Requests\FotoProfilRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\Audit;
use App\Support\FotoProfil;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProfileController extends Controller
{
    /**
     * Profil pengguna yang sedang masuk.
     *
     * Departemen dan role tidak dapat diubah sendiri — perubahan itu
     * wewenang administrator.
     */
    public function show(Request $request): JsonResponse
    {
        $pengguna = $request->user()->loadMissing(['role', 'department']);

        return ApiResponse::ok([
            'pengguna' => new UserResource($pengguna),
            'bergabung_pada' => $pengguna->created_at?->toIso8601String(),
            'masuk_terakhir' => $pengguna->last_login_at?->toIso8601String(),
        ]);
    }

    /**
     * Mengubah nama tampilan sendiri.
     */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate(
            ['name' => ['required', 'string', 'max:100']],
            attributes: ['name' => 'nama'],
        );

        $pengguna = $request->user();
        $sebelum = $pengguna->name;

        $pengguna->update($data);

        if ($sebelum !== $pengguna->name) {
            Audit::catat(
                Audit::AKSI_DIPERBARUI,
                Audit::MODUL_PENGGUNA,
                'Memperbarui profil sendiri',
                $pengguna,
                ['name' => ['sebelum' => $sebelum, 'sesudah' => $pengguna->name]],
            );
        }

        return ApiResponse::ok(
            new UserResource($pengguna->loadMissing(['role', 'department'])),
            'Profil berhasil diperbarui.',
        );
    }

    /**
     * Mengganti foto profil sendiri.
     *
     * Foto lama dihapus setelah yang baru tersimpan, bukan sebelumnya: bila
     * penyimpanan gagal di tengah jalan, pengguna tetap punya foto lamanya alih-
     * alih kehilangan keduanya.
     */
    public function unggahFoto(FotoProfilRequest $request): JsonResponse
    {
        $pengguna = $request->user();
        $lama = $pengguna->avatar_path;

        $jalur = FotoProfil::simpan($request->file('foto'), $pengguna->getKey());

        $pengguna->forceFill(['avatar_path' => $jalur])->save();

        FotoProfil::hapus($lama);

        Audit::catat(
            Audit::AKSI_DIPERBARUI,
            Audit::MODUL_PENGGUNA,
            'Mengganti foto profil sendiri',
            $pengguna,
        );

        return ApiResponse::ok(
            new UserResource($pengguna->loadMissing(['role', 'department'])),
            'Foto profil berhasil diperbarui.',
        );
    }

    public function hapusFoto(Request $request): JsonResponse
    {
        $pengguna = $request->user();

        if ($pengguna->avatar_path === null) {
            return ApiResponse::ok(
                new UserResource($pengguna->loadMissing(['role', 'department'])),
                'Belum ada foto profil yang perlu dihapus.',
            );
        }

        $jalur = $pengguna->avatar_path;

        $pengguna->forceFill(['avatar_path' => null])->save();

        FotoProfil::hapus($jalur);

        Audit::catat(
            Audit::AKSI_DIPERBARUI,
            Audit::MODUL_PENGGUNA,
            'Menghapus foto profil sendiri',
            $pengguna,
        );

        return ApiResponse::ok(
            new UserResource($pengguna->loadMissing(['role', 'department'])),
            'Foto profil berhasil dihapus.',
        );
    }

    /**
     * Menyajikan foto profil seseorang.
     *
     * ⚠️ Berkasnya berada di cakram `local`, **bukan** direktori publik, dan
     * hanya dapat diambil lewat sini. Foto orang bukan berkas yang boleh diunduh
     * siapa pun yang menebak alamatnya.
     *
     * Siapa pun yang sudah masuk boleh melihat foto rekan kerjanya — nama dan
     * departemen mereka pun sudah tampil pada laporan, papan progres, dan daftar
     * penyaring. Yang tidak boleh adalah pengunjung tanpa sesi.
     */
    public function foto(User $pengguna): StreamedResponse|JsonResponse
    {
        $jalur = $pengguna->avatar_path;

        if ($jalur === null || ! Storage::disk(FotoProfil::CAKRAM)->exists($jalur)) {
            return ApiResponse::error('Foto profil tidak ditemukan.', 404);
        }

        return Storage::disk(FotoProfil::CAKRAM)->response($jalur, null, [
            'Content-Type' => 'image/jpeg',

            /*
             * `private` — foto ini bukan milik umum, dan proksi bersama tidak
             * boleh menyimpannya untuk pengguna lain. `max-age` pendek: foto
             * yang baru diganti harus terlihat berganti tanpa memaksa pengguna
             * memuat ulang dengan tembolok dikosongkan.
             */
            'Cache-Control' => 'private, max-age=60',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /**
     * Mengubah kata sandi sendiri.
     *
     * Kata sandi lama wajib dibuktikan agar sesi yang tertinggal terbuka di
     * perangkat lain tidak dapat mengambil alih akun.
     */
    public function ubahKataSandi(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kata_sandi_lama' => ['required', 'string'],
            'kata_sandi_baru' => ['required', 'string', 'confirmed', Password::min(8)],
        ], attributes: [
            'kata_sandi_lama' => 'kata sandi lama',
            'kata_sandi_baru' => 'kata sandi baru',
        ]);

        $pengguna = $request->user();

        if (! Hash::check($data['kata_sandi_lama'], $pengguna->password)) {
            Log::warning('Percobaan ubah kata sandi dengan kata sandi lama yang salah', [
                'user_id' => $pengguna->id,
                'ip' => $request->ip(),
            ]);

            throw ValidationException::withMessages([
                'kata_sandi_lama' => 'Kata sandi lama tidak sesuai.',
            ]);
        }

        if (Hash::check($data['kata_sandi_baru'], $pengguna->password)) {
            throw ValidationException::withMessages([
                'kata_sandi_baru' => 'Kata sandi baru harus berbeda dari kata sandi lama.',
            ]);
        }

        $pengguna->forceFill(['password' => $data['kata_sandi_baru']])->save();

        // Token lain dicabut; token yang sedang dipakai dipertahankan agar
        // pengguna tidak terlempar keluar tepat setelah berhasil mengubah.
        $tokenSaatIni = $pengguna->currentAccessToken();
        $pengguna->tokens()
            ->when($tokenSaatIni !== null, fn ($query) => $query->whereKeyNot($tokenSaatIni->getKey()))
            ->delete();

        Audit::catat(
            Audit::AKSI_SANDI_DIATUR_ULANG,
            Audit::MODUL_PENGGUNA,
            'Mengubah kata sandi sendiri',
            $pengguna,
        );

        return ApiResponse::ok(null, 'Kata sandi berhasil diperbarui.');
    }
}
