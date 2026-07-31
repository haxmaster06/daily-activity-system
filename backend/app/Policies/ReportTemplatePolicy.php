<?php

namespace App\Policies;

use App\Models\ReportTemplate;
use App\Models\User;
use App\Support\KatalogIzin;

/**
 * Deny by default (non-fungsional §2.3).
 *
 * Semua pengguna yang sudah masuk boleh membaca template — dibutuhkan untuk
 * merender form laporan. Perubahan bentuk template hanya oleh administrator,
 * karena mengubahnya berarti mengubah arti data seluruh departemen.
 */
class ReportTemplatePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->boleh(KatalogIzin::TEMPLATE_LIHAT);
    }

    public function view(User $user, ReportTemplate $template): bool
    {
        return $user->boleh(KatalogIzin::TEMPLATE_LIHAT);
    }

    public function create(User $user): bool
    {
        return $user->boleh(KatalogIzin::TEMPLATE_KELOLA);
    }

    public function update(User $user, ReportTemplate $template): bool
    {
        return $user->boleh(KatalogIzin::TEMPLATE_KELOLA);
    }

    public function delete(User $user, ReportTemplate $template): bool
    {
        return $user->boleh(KatalogIzin::TEMPLATE_KELOLA);
    }
}
