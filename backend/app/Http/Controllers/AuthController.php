<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    /**
     * Masuk ke sistem dan menerima token akses.
     *
     * Rate limit dipasang pada rute (5 percobaan per menit) untuk menahan
     * brute force (non-fungsional §7).
     */
    public function login(LoginRequest $request): JsonResponse
    {
        /** @var array{email: string, password: string} $kredensial */
        $kredensial = $request->validated();

        $user = User::with(['role', 'department'])
            ->where('email', $kredensial['email'])
            ->first();

        // Hash::check tetap dipanggil walau user tidak ada agar waktu respons
        // tidak membocorkan email mana yang terdaftar.
        $cocok = $user !== null && Hash::check($kredensial['password'], $user->password);

        if (! $cocok) {
            Log::warning('Percobaan masuk gagal', [
                'email' => $kredensial['email'],
                'ip' => $request->ip(),
            ]);

            // Pesan sengaja tidak menyebutkan bagian mana yang salah.
            return ApiResponse::error('Email atau kata sandi tidak sesuai.', 401);
        }

        if (! $user->is_active) {
            Log::warning('Percobaan masuk oleh akun nonaktif', [
                'user_id' => $user->id,
                'ip' => $request->ip(),
            ]);

            return ApiResponse::error(
                'Akun Anda tidak aktif. Hubungi administrator.',
                403,
            );
        }

        // Token lama dicabut agar satu akun tidak meninggalkan token menganggur
        // yang masih berlaku di perangkat lain.
        $user->tokens()->delete();

        $masaBerlaku = now()->addMinutes($request->masaBerlakuMenit());

        $token = $user->createToken(
            name: 'dams-web',
            expiresAt: $masaBerlaku,
        );

        $user->forceFill(['last_login_at' => now()])->save();

        Log::info('Pengguna berhasil masuk', [
            'user_id' => $user->id,
            'ip' => $request->ip(),
        ]);

        return ApiResponse::ok([
            'token' => $token->plainTextToken,
            'kedaluwarsa_pada' => $masaBerlaku->toIso8601String(),
            'pengguna' => new UserResource($user),
        ], 'Berhasil masuk.');
    }

    /**
     * Keluar dari sistem dan mencabut token yang sedang dipakai.
     */
    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()?->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return ApiResponse::ok(null, 'Berhasil keluar.');
    }

    /**
     * Data pengguna yang sedang masuk.
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->loadMissing(['role', 'department']);

        return ApiResponse::ok(new UserResource($user));
    }
}
