#!/bin/sh
set -e

cd /var/www/html

# Jumlah proses PHP-FPM disetel per server lewat environment, tanpa membangun
# ulang image. Ditulis dengan sed, bukan ${VAR} di dalam config: PHP-FPM tidak
# menjamin menguraikannya, dan bila gagal container tidak menyala sama sekali.
JUMLAH_FPM="${PHP_FPM_MAX_CHILDREN:-8}"
POOL=/usr/local/etc/php-fpm.d/zz-dams.conf

if [ -f "$POOL" ]; then
    sed -i "s/^pm.max_children = .*/pm.max_children = ${JUMLAH_FPM}/" "$POOL"
    echo "[dams] PHP-FPM: ${JUMLAH_FPM} proses."
fi

echo "[dams] menunggu database siap..."
until php -r "new PDO('mysql:host='.getenv('DB_HOST').';port='.getenv('DB_PORT'), getenv('DB_USERNAME'), getenv('DB_PASSWORD'));" 2>/dev/null; do
    sleep 2
done
echo "[dams] database siap."

# ---------------------------------------------------------------------------
# Migration tidak dijalankan otomatis di sini.
#
# Alur deployment wajib: Build -> Test -> BACKUP -> Deploy -> Migration ->
# Health Check -> Verify (non-fungsional §30). Migration dijalankan sebagai
# langkah tersendiri setelah backup terverifikasi:
#
#     docker compose exec backend php artisan migrate --force
#
# `migrate:fresh`, `migrate:refresh`, `migrate:reset`, dan `db:wipe` dilarang
# tanpa izin eksplisit — lihat docs/adr/ADR-008-larangan-fresh-migrate.md.
# ---------------------------------------------------------------------------

php artisan config:cache
php artisan route:cache
php artisan event:cache

# Tautan storage publik dibuat bila belum ada
php artisan storage:link --quiet || true

echo "[dams] backend siap pada port 8000."

exec "$@"
