<?php

namespace App\Exceptions;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * Perubahan yang akan menghabiskan pengelola terakhir.
 *
 * Dilempar `App\Support\PenjagaAkses` dan dijawab 422 — ini kesalahan yang
 * dapat diperbaiki pengguna, bukan gangguan sistem.
 */
class PengelolaTerakhirException extends RuntimeException
{
    public function render(): JsonResponse
    {
        return ApiResponse::error($this->getMessage(), 422);
    }
}
