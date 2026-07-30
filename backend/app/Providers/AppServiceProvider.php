<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Tanggal ditampilkan dalam Bahasa Indonesia lewat `translatedFormat`
        // (standar §26). Format teknis (ISO 8601, Ymd) tidak terpengaruh.
        Carbon::setLocale(config('app.locale'));
        Date::use(CarbonImmutable::class);

        // Relasi yang belum di-eager-load melempar exception saat pengembangan,
        // sehingga masalah N+1 tertangkap sebelum sampai produksi
        // (non-fungsional §15.4).
        Model::preventLazyLoading(! app()->isProduction());

        // Atribut yang tidak ada di tabel tidak diam-diam terabaikan.
        Model::preventSilentlyDiscardingAttributes(! app()->isProduction());
    }
}
