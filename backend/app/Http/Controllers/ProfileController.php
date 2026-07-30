<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Support\ApiResponse;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

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
