<?php

namespace App\Support;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

/**
 * Pembentuk response API DAMS.
 *
 * Seluruh endpoint mengembalikan bentuk yang sama (standar konsistensi §13):
 *
 *     { "success": true, "message": "", "data": {} }
 *
 * Daftar ter-paginate menambahkan kunci "meta" berisi informasi halaman.
 * Response galat menambahkan "errors" dan/atau "reference".
 */
final class ApiResponse
{
    /**
     * @param  array<string, mixed>|object|null  $data
     * @param  list<string>  $peringatan  Pemberitahuan non-galat; disertakan hanya bila ada.
     */
    public static function ok(
        mixed $data = null,
        string $message = '',
        int $status = 200,
        array $peringatan = [],
    ): JsonResponse {
        $payload = [
            'success' => true,
            'message' => $message,
            'data' => $data,
        ];

        if ($peringatan !== []) {
            $payload['peringatan'] = $peringatan;
        }

        return response()->json($payload, $status);
    }

    /**
     * @param  list<string>  $peringatan
     */
    public static function created(
        mixed $data = null,
        string $message = 'Data berhasil disimpan.',
        array $peringatan = [],
    ): JsonResponse {
        return self::ok($data, $message, 201, $peringatan);
    }

    /**
     * Daftar ter-paginate. Metadata halaman dipisah dari data agar bentuk
     * "data" tetap berupa array baris, bukan objek paginator Laravel.
     */
    public static function paginated(LengthAwarePaginator $paginator, string $message = ''): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $paginator->items(),
            'meta' => [
                'halaman_saat_ini' => $paginator->currentPage(),
                'per_halaman' => $paginator->perPage(),
                'total_data' => $paginator->total(),
                'total_halaman' => $paginator->lastPage(),
            ],
        ]);
    }

    /**
     * Galat yang dapat ditindaklanjuti user (validasi, izin, data tidak ditemukan).
     *
     * @param  array<string, array<int, string>>  $errors
     */
    public static function error(
        string $message,
        int $status = 400,
        array $errors = [],
        ?string $reference = null,
    ): JsonResponse {
        $payload = [
            'success' => false,
            'message' => $message,
            'data' => null,
        ];

        if ($errors !== []) {
            $payload['errors'] = $errors;
        }

        if ($reference !== null) {
            $payload['reference'] = $reference;
        }

        return response()->json($payload, $status);
    }
}
