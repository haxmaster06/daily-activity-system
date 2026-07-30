<?php

namespace App\Http\Controllers;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController extends Controller
{
    /**
     * Pemeriksaan kesehatan layanan.
     *
     * Dipakai health check container dan verifikasi setelah deployment
     * (non-fungsional §30). Tidak membutuhkan autentikasi dan tidak
     * membocorkan informasi konfigurasi.
     */
    public function __invoke(): JsonResponse
    {
        $databaseSiap = $this->periksaDatabase();

        return ApiResponse::ok([
            'service' => 'dams-api',
            'status' => $databaseSiap ? 'sehat' : 'terganggu',
            'database' => $databaseSiap ? 'terhubung' : 'tidak terhubung',
            'waktu' => now()->toIso8601String(),
        ], status: $databaseSiap ? 200 : 503);
    }

    private function periksaDatabase(): bool
    {
        try {
            DB::connection()->getPdo();

            return true;
        } catch (Throwable) {
            return false;
        }
    }
}
