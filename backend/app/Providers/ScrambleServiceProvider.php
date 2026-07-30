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

        Scramble::configure()
            ->withDocumentTransformers(function ($openApi): void {
                $openApi->secure(
                    SecurityScheme::http('bearer'),
                );
            });
    }
}
