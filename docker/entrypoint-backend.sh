#!/bin/sh
set -e

cd /var/www/html

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
