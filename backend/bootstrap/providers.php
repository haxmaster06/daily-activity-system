<?php

use App\Providers\AppServiceProvider;
use App\Providers\RateLimitServiceProvider;
use App\Providers\ScrambleServiceProvider;

return [
    AppServiceProvider::class,
    RateLimitServiceProvider::class,
    ScrambleServiceProvider::class,
];
