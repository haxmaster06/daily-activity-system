<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Rute API DAMS
|--------------------------------------------------------------------------
|
| Seluruh rute mengembalikan envelope { success, message, data }.
| Rute yang menyentuh data wajib memakai middleware `auth:sanctum` dan
| pemeriksaan izin lewat Policy — deny by default (non-fungsional §2.3).
|
*/

Route::get('/health', HealthController::class)->name('health');

Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:login')
    ->name('login');

Route::middleware(['auth:sanctum', 'aktif', 'throttle:api'])->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::get('/me', [AuthController::class, 'me'])->name('me');

    // Endpoint master data dan laporan ditambahkan pada M2 dan M3.
});
