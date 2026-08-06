# Image backend Laravel: PHP-FPM + Nginx dalam satu container,
# dijalankan oleh supervisord.

FROM php:8.4-fpm-alpine AS base

# Pustaka runtime dipasang TERPISAH dari pustaka pembangun, dan tidak ikut
# dibuang.
#
# Paket `-dev` menarik pustaka runtimenya sebagai dependensi. `apk del icu-dev
# libzip-dev` karena itu ikut membuang `icu-libs` dan `libzip` — yang justru
# dibutuhkan `intl.so` dan `zip.so` setiap kali PHP menyala. Berkas ekstensinya
# tetap ada, sehingga kegagalannya menyesatkan: `php -m` diam, lalu composer
# melapor "ext-zip is missing from your system" padahal ini-nya jelas terpasang.
#
# Menyebut pustaka runtime sebagai paket eksplisit membuatnya menjadi anggota
# `world` apk, dan anggota `world` tidak pernah ikut terbuang oleh `apk del`.
#
# Tiga ekstensi yang tidak ada pada image dasar dan tetap dibutuhkan:
#
#   sockets   diminta spiral/goridge dan spiral/roadrunner-worker; tanpa ini
#             `composer install` menolak berjalan sama sekali.
#   pcntl     dipakai `queue:work --timeout` untuk benar-benar menegakkan batas
#             waktunya, dan `reverb:start` untuk menangani sinyal saat container
#             dinyalakan ulang. Tanpa pcntl keduanya berjalan, tetapi diam-diam
#             mengabaikan batas waktu dan penghentian yang rapi.
#   redis     `.env` menyetel REDIS_CLIENT=phpredis, dan predis/predis tidak ada
#             di composer.lock. Tanpa ekstensi ini cache, antrean, dan sesi —
#             ketiganya diarahkan ke Redis — gagal pada permintaan pertama.
RUN apk add --no-cache \
        nginx \
        supervisor \
        icu-libs \
        libzip \
        freetype \
        libjpeg-turbo \
        libpng \
        # `dams:backup` memanggil mysqldump, dan `dams:uji-restore` memanggil
        # mysql — keduanya proses terpisah, bukan pustaka PHP. Tanpa paket ini
        # cadangan terjadwal gagal tiap malam dengan "mysqldump: not found",
        # dan gagalnya tidak terlihat sampai seseorang membutuhkan cadangan
        # yang ternyata tidak pernah ada. ADR-008 melarang reset basis data,
        # sehingga cadangan adalah satu-satunya jalan pulih.
        #
        # `mariadb-connector-c` menyertai `mariadb-client` bukan sebagai
        # pelengkap: paket klien saja meninggalkan direktori pluginnya kosong,
        # sedangkan MySQL 8 memakai caching_sha2_password sebagai bawaan.
        # Tanpa plugin itu mysqldump ditolak saat menyambung — "Plugin
        # caching_sha2_password could not be loaded" — walau kredensialnya benar.
        mariadb-client \
        mariadb-connector-c \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS \
        # musl tidak membawa header kernel Linux. Tanpa ini `sockets` gagal
        # dikompilasi pada `#include <linux/sock_diag.h>`.
        linux-headers \
        icu-dev \
        libzip-dev \
        oniguruma-dev \
        freetype-dev \
        libjpeg-turbo-dev \
        libpng-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        bcmath \
        intl \
        zip \
        gd \
        opcache \
        sockets \
        pcntl \
    && yes '' | pecl install redis \
    && docker-php-ext-enable redis \
    && pecl clear-cache \
    && apk del --no-network .build-deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# ---------------------------------------------------------------------------
# Tahap dependency — dipisah agar layer cache tidak batal tiap kali kode berubah
# ---------------------------------------------------------------------------
FROM base AS vendor

COPY backend/composer.json backend/composer.lock ./
RUN composer install \
        --no-dev \
        --no-scripts \
        --no-autoloader \
        --prefer-dist \
        --no-interaction

# ---------------------------------------------------------------------------
# Image akhir
# ---------------------------------------------------------------------------
FROM base AS runtime

COPY --from=vendor /var/www/html/vendor ./vendor
COPY backend/ ./

RUN composer dump-autoload --optimize --no-dev --classmap-authoritative \
    && mkdir -p storage/framework/{cache/data,sessions,views} storage/logs storage/app/attachments storage/app/exports bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/opcache.ini
COPY docker/php/php.ini /usr/local/etc/php/conf.d/dams.ini
COPY docker/php/pool.conf /usr/local/etc/php-fpm.d/zz-dams.conf

# Jumlah proses PHP-FPM dibaca dari environment saat container berjalan,
# sehingga dapat disetel per server tanpa membangun ulang image.
ENV PHP_FPM_MAX_CHILDREN=8
COPY docker/nginx/backend.conf /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint-backend.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8000/api/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
