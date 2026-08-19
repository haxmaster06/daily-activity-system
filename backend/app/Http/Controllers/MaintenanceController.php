<?php

namespace App\Http\Controllers;

use App\Http\Requests\MaintenanceRequest;
use App\Models\AppSetting;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

/**
 * Mode Pemeliharaan.
 *
 * `show` sengaja publik (di luar penjaga pemeliharaan) supaya halaman
 * pemeliharaan tetap dapat membaca pesannya. `update` dijaga izin
 * `sistem.maintenance` pada rutenya.
 */
class MaintenanceController extends Controller
{
    public function show(): JsonResponse
    {
        $state = AppSetting::ambil('pemeliharaan', []);

        return ApiResponse::ok([
            'aktif' => (bool) ($state['aktif'] ?? false),
            'pesan' => $state['pesan'] ?? null,
        ]);
    }

    public function update(MaintenanceRequest $request): JsonResponse
    {
        $data = $request->validated();

        AppSetting::simpan('pemeliharaan', [
            'aktif' => (bool) $data['aktif'],
            'pesan' => $data['pesan'] ?? null,
            'sejak' => now()->toIso8601String(),
            'oleh' => $request->user()->name,
        ]);

        return ApiResponse::ok(
            ['aktif' => (bool) $data['aktif'], 'pesan' => $data['pesan'] ?? null],
            $data['aktif'] ? 'Mode pemeliharaan dinyalakan.' : 'Mode pemeliharaan dimatikan.',
        );
    }
}
