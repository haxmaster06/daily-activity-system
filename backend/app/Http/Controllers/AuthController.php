<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Support\ApiResponse;
use Carbon\CarbonInterface;
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

        $this->rapikanToken($user);

        /*
         * Nol berarti sesi tidak pernah berakhir sendiri: token dibuat tanpa
         * `expires_at`, dan `PerpanjangSesi` melewatinya karena tidak ada
         * tanggal yang bisa digeser. Lihat catatan di config/dams.php.
         */
        $menit = $request->masaBerlakuMenit();
        $masaBerlaku = $menit > 0 ? now()->addMinutes($menit) : null;

        $token = $user->createToken(
            name: 'dams-web',
            expiresAt: $masaBerlaku,
        );

        // Panjang jendela disimpan sekali; `PerpanjangSesi` memakainya sebagai
        // patokan tetap saat menggeser masa berlaku.
        $token->accessToken->forceFill(['sesi_menit' => $menit])->save();

        $user->forceFill(['last_login_at' => now()])->save();

        Log::info('Pengguna berhasil masuk', [
            'user_id' => $user->id,
            'ip' => $request->ip(),
        ]);

        return ApiResponse::ok([
            'token' => $token->plainTextToken,
            'kedaluwarsa_pada' => $masaBerlaku?->toIso8601String(),
            /*
             * Batas umur cookie pembawa token, bukan batas sesi.
             *
             * Sesi bergeser selama dipakai, sehingga cookie yang hanya
             * berumur sepanjang jendela awal akan mati lebih dulu daripada
             * tokennya dan mengeluarkan pengguna yang justru sedang aktif.
             * Yang menentukan sesi berakhir tetap `expires_at` di server;
             * cookie hanya wadahnya.
             */
            'cookie_berlaku_sampai' => $this->batasCookie()->toIso8601String(),
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

    /**
     * Sampai kapan cookie pembawa token boleh hidup di peramban.
     *
     * Ketika sesi tidak lagi berakhir sendiri, cookie tetap butuh tanggal:
     * tanpa itu ia jadi cookie sesi dan hilang begitu peramban ditutup —
     * pengguna diminta masuk lagi tiap pagi. Dipakai 400 hari karena itu
     * batas atas yang diterima peramban; lebih dari itu dipangkas sendiri.
     */
    private function batasCookie(): CarbonInterface
    {
        $menit = (int) config('dams.sesi.menit_diingat', 0);

        return $menit > 0 ? now()->addMinutes($menit) : now()->addDays(400);
    }

    /**
     * Membereskan token sebelum yang baru dibuat.
     *
     * Satu akun boleh dipakai di beberapa perangkat — komputer di ruang kerja
     * dan ponsel di lapangan adalah pemakaian yang wajar, dan mencabut token
     * lama setiap kali masuk membuat pengguna terlempar keluar tanpa sebab
     * yang ia pahami.
     *
     * Yang dibuang: token yang sudah lewat masa berlakunya, lalu yang tertua
     * bila jumlahnya melebihi batas perangkat. Yang tertua, bukan yang
     * terbaru, supaya masuk dari perangkat baru tidak pernah ditolak.
     *
     * Batas 0 mematikan pembuangan itu. Membuang token tertua berarti
     * mengeluarkan seseorang yang mungkin sedang bekerja — persis gangguan
     * yang diminta pemilik project untuk dihilangkan.
     */
    private function rapikanToken(User $user): void
    {
        $user->tokens()->whereNotNull('expires_at')->where('expires_at', '<=', now())->delete();

        $batas = (int) config('dams.sesi.maksimal_perangkat', 0);

        if ($batas <= 0) {
            return;
        }

        // Disisakan satu tempat untuk token yang sedang dibuat.
        $dipertahankan = $user->tokens()->latest('id')->limit($batas - 1)->pluck('id');

        $user->tokens()->whereNotIn('id', $dipertahankan)->delete();
    }
}
