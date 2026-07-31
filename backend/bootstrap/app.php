<?php

use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\PerpanjangSesi;
use App\Support\ApiResponse;
use App\Support\ErrorReference;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            HandleCors::class,
        ]);

        $middleware->alias([
            'aktif' => EnsureUserIsActive::class,
            'perpanjang-sesi' => PerpanjangSesi::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        /*
         * Galat teknis tidak boleh bocor ke antarmuka (non-fungsional §27).
         * User menerima kalimat Bahasa Indonesia dan kode referensi; detail
         * teknis hanya masuk log.
         */
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            /*
             * Sebagian komponen — mis. limiter `throttle` — sudah menyiapkan
             * response sendiri dan membungkusnya dalam HttpResponseException.
             * Response itu diteruskan apa adanya, bukan diubah jadi galat 500.
             */
            if ($e instanceof HttpResponseException) {
                return $e->getResponse();
            }

            if ($e instanceof ValidationException) {
                return ApiResponse::error(
                    'Periksa kembali isian Anda.',
                    422,
                    $e->errors(),
                );
            }

            if ($e instanceof AuthenticationException) {
                return ApiResponse::error('Sesi Anda telah berakhir. Silakan masuk kembali.', 401);
            }

            if ($e instanceof ModelNotFoundException) {
                return ApiResponse::error('Data yang Anda cari tidak ditemukan.', 404);
            }

            /*
             * Pesan diturunkan dari kode status, bukan dari pesan exception.
             *
             * Laravel mengubah AuthorizationException menjadi
             * AccessDeniedHttpException sebelum callback ini berjalan, dan
             * pesan bawaannya berbahasa Inggris ("This action is
             * unauthorized."). Meneruskan pesan exception apa adanya membuat
             * teks framework bocor ke antarmuka — dilarang standar §25.
             *
             * Pesan galat milik aplikasi sendiri tidak melewati jalur ini;
             * semuanya dikirim lewat ApiResponse::error().
             */
            if ($e instanceof HttpExceptionInterface && $e->getStatusCode() < 500) {
                $status = $e->getStatusCode();

                return ApiResponse::error(match ($status) {
                    401 => 'Sesi Anda telah berakhir. Silakan masuk kembali.',
                    403 => 'Anda tidak memiliki akses ke data ini.',
                    404 => 'Data yang Anda cari tidak ditemukan.',
                    405 => 'Permintaan tidak dapat diproses.',
                    409 => 'Data sedang berubah. Muat ulang halaman lalu coba lagi.',
                    413 => 'Berkas yang dikirim terlalu besar.',
                    419 => 'Sesi Anda telah berakhir. Silakan masuk kembali.',
                    429 => 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.',
                    default => 'Permintaan tidak dapat diproses.',
                }, $status);
            }

            $reference = ErrorReference::generate();

            Log::error('Galat tidak tertangani', [
                'reference' => $reference,
                'exception' => $e::class,
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'path' => $request->path(),
                'method' => $request->method(),
                'user_id' => $request->user()?->getAuthIdentifier(),
                'ip' => $request->ip(),
            ]);

            return ApiResponse::error(
                'Terjadi gangguan saat memproses permintaan.',
                500,
                reference: $reference,
            );
        });
    })->create();
