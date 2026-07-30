<?php

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

Route::middleware('auth:sanctum')->group(function (): void {
    // Endpoint terautentikasi ditambahkan mulai M1 (Auth & Role).
});
