<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

abstract class Controller
{
    /**
     * Menyediakan `$this->authorize()` bagi seluruh controller.
     *
     * Otorisasi diputuskan Policy, bukan pengecekan role yang ditulis ulang
     * di tiap aksi (non-fungsional §2.3).
     */
    use AuthorizesRequests;
}
