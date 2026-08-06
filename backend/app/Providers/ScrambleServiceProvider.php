<?php

namespace App\Providers;

use Dedoc\Scramble\Scramble;
use Dedoc\Scramble\Support\Generator\SecurityScheme;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class ScrambleServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        /*
         * Dokumentasi API tidak boleh terbuka di produksi — daftar endpoint
         * dan bentuk payload adalah informasi berguna bagi penyerang
         * (non-fungsional §13, Security Misconfiguration).
         */
        Gate::define('viewApiDocs', function ($user = null): bool {
            return ! app()->isProduction();
        });

        /*
         * Scramble adalah dependency dev — pembangkit dokumentasi API, bukan
         * bagian dari aplikasi yang berjalan. Image produksi dibangun dengan
         * `composer install --no-dev`, sehingga kelasnya memang tidak ada di
         * sana, dan memanggilnya tanpa penjagaan membuat `package:discover`
         * berhenti dengan "Class Dedoc\Scramble\Scramble not found" — aplikasi
         * gagal dibangun, bukan sekadar kehilangan dokumentasinya.
         */
        if (! class_exists(Scramble::class)) {
            return;
        }

        Scramble::configure()
            ->withDocumentTransformers(function ($openApi): void {
                $openApi->secure(
                    SecurityScheme::http('bearer'),
                );
            });
    }
}
