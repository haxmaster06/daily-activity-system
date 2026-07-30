<?php

use App\Support\ApiResponse;
use App\Support\ErrorReference;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\HandleCors;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

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

            if ($e instanceof AuthorizationException) {
                return ApiResponse::error('Anda tidak memiliki akses ke data ini.', 403);
            }

            if ($e instanceof ModelNotFoundException || $e instanceof NotFoundHttpException) {
                return ApiResponse::error('Data yang Anda cari tidak ditemukan.', 404);
            }

            if ($e instanceof TooManyRequestsHttpException) {
                return ApiResponse::error(
                    'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.',
                    429,
                );
            }

            if ($e instanceof HttpExceptionInterface && $e->getStatusCode() < 500) {
                return ApiResponse::error(
                    $e->getMessage() !== '' ? $e->getMessage() : 'Permintaan tidak dapat diproses.',
                    $e->getStatusCode(),
                );
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
