<?php

/*
|--------------------------------------------------------------------------
| Cross-Origin Resource Sharing (CORS)
|--------------------------------------------------------------------------
|
| Frontend Next.js berjalan di origin berbeda (port 13001). Origin yang
| diizinkan dibatasi ke daftar yang jelas — bukan '*' — sesuai standar
| non-fungsional §6 (API Security).
|
| Token Sanctum dikirim sebagai bearer header dari Route Handler Next.js,
| bukan lewat cookie lintas origin, sehingga `supports_credentials` tetap
| dimatikan.
|
*/

return [

    'paths' => ['api/*'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => array_values(array_filter([
        env('FRONTEND_URL', 'http://localhost:13001'),
    ])),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'X-Requested-With'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => false,

];
