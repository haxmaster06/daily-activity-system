#!/usr/bin/env bash
#
# Pemeriksaan deployment DAMS.
#
# Menghantam stack yang benar-benar berjalan, bukan meniru sebagiannya. Tiap
# pemeriksaan lahir dari kegagalan yang pernah terjadi dan tidak terlihat dari
# layar: aplikasi tampak sehat, halaman terbuka, tetapi ada jalur yang diam-diam
# mati. Yang paling mahal justru yang paling sunyi — Server Action membalas 500
# untuk setiap penyimpanan, atau lonceng notifikasi menyambung ke 127.0.0.1
# milik peramban pengguna sendiri.
#
# Dijalankan sesudah tiap `docker compose up -d`, dari akar repositori:
#
#     ./scripts/periksa-deployment.sh
#
# Keluar dengan kode 1 bila ada satu saja yang gagal, sehingga dapat dirantai:
#
#     docker compose up -d && ./scripts/periksa-deployment.sh
#
# Environment yang dikenali:
#
#     DAMS_URL_UJI    alamat pintu (bawaan http://127.0.0.1:13001)
#     DAMS_UJI_EMAIL  akun untuk pemeriksaan bersesi
#     DAMS_UJI_SANDI  kata sandinya
#
# Bila kredensial tidak diberikan, nilainya diambil dari `.env`. Bila tetap
# tidak ada, skrip BERHENTI — pemeriksaan yang dilewati diam-diam adalah rasa
# aman yang palsu.

set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.." || exit 1

URL="${DAMS_URL_UJI:-http://127.0.0.1:13001}"
BERKAS_ENV=".env"

MERAH=$'\e[31m'; HIJAU=$'\e[32m'; KUNING=$'\e[33m'; REDUP=$'\e[2m'; NORMAL=$'\e[0m'
if [ ! -t 1 ]; then MERAH=''; HIJAU=''; KUNING=''; REDUP=''; NORMAL=''; fi

LOLOS=0
GAGAL=0
NOMOR=0
KERANJANG="$(mktemp -d)"
trap 'rm -rf "$KERANJANG"' EXIT

nilai_env() {
    # Mengambil satu nilai dari .env tanpa mengeksekusi berkasnya.
    sed -n "s/^$1=//p" "$BERKAS_ENV" 2>/dev/null | head -1
}

mulai() {
    NOMOR=$((NOMOR + 1))
    printf '%2d. %-52s' "$NOMOR" "$1"
}

lolos() {
    LOLOS=$((LOLOS + 1))
    printf '%s✓%s %s\n' "$HIJAU" "$NORMAL" "${1:-}"
}

gagal() {
    GAGAL=$((GAGAL + 1))
    printf '%s✗ GAGAL%s %s\n' "$MERAH" "$NORMAL" "${1:-}"
}

catatan() {
    printf '    %s%s%s\n' "$REDUP" "$1" "$NORMAL"
}

if [ ! -r "$BERKAS_ENV" ]; then
    printf '%sBerkas .env tidak terbaca. Jalankan dari akar repositori.%s\n' "$MERAH" "$NORMAL"
    exit 1
fi

EMAIL="${DAMS_UJI_EMAIL:-$(nilai_env DAMS_ADMIN_EMAIL)}"
SANDI="${DAMS_UJI_SANDI:-$(nilai_env DAMS_ADMIN_PASSWORD)}"
KUNCI_REVERB="$(nilai_env REVERB_APP_KEY)"
HOST_REVERB="$(nilai_env REVERB_PUBLIC_HOST)"
COOKIE_SECURE="$(nilai_env DAMS_COOKIE_SECURE)"

if [ -z "$EMAIL" ] || [ -z "$SANDI" ]; then
    printf '%sKredensial tidak ada.%s Setel DAMS_UJI_EMAIL dan DAMS_UJI_SANDI, atau isi\n' "$MERAH" "$NORMAL"
    printf 'DAMS_ADMIN_EMAIL dan DAMS_ADMIN_PASSWORD di .env.\n'
    exit 1
fi

printf '\n%sPemeriksaan deployment DAMS%s  %s%s%s\n\n' "$NORMAL" "$NORMAL" "$REDUP" "$URL" "$NORMAL"

# ---------------------------------------------------------------------------
# 1. Container
# ---------------------------------------------------------------------------
mulai 'Container berjalan dan sehat'
HIDUP="$(docker compose ps --format '{{.Name}} {{.Status}}' 2>/dev/null)"
JUMLAH="$(printf '%s\n' "$HIDUP" | grep -c '^dams-')"
SAKIT="$(printf '%s\n' "$HIDUP" | grep -c 'unhealthy')"
if [ "$JUMLAH" -eq 8 ] && [ "$SAKIT" -eq 0 ]; then
    lolos "8 container, tidak ada yang unhealthy"
else
    gagal "$JUMLAH container (harusnya 8), $SAKIT unhealthy"
    printf '%s\n' "$HIDUP" | grep -E 'unhealthy|Exit' | while read -r baris; do catatan "$baris"; done
fi

# ---------------------------------------------------------------------------
# 2. Pintu tunggal
# ---------------------------------------------------------------------------
# Hanya port pintu yang boleh mendengarkan di seluruh antarmuka. MySQL dan
# Redis yang terbuka ke internet melanggar non-fungsional §13.
mulai 'Hanya port pintu yang terbuka ke luar'
BOCOR=''
for p in 13002 13003 13306 13379; do
    if ss -tln 2>/dev/null | grep -qE "0\.0\.0\.0:$p|\[::\]:$p"; then
        BOCOR="$BOCOR $p"
    fi
done
if ss -tln 2>/dev/null | grep -q '0.0.0.0:13001' && [ -z "$BOCOR" ]; then
    lolos "13001 publik; 13002/13003/13306/13379 hanya 127.0.0.1"
else
    gagal "port terbuka ke seluruh antarmuka:$BOCOR"
fi

# ---------------------------------------------------------------------------
# 3. Header Host pada proxy
# ---------------------------------------------------------------------------
# `$host` membuang nomor port, sedangkan `Origin` dari peramban membawanya.
# Selisih itu membuat Next.js menolak SETIAP Server Action dengan 500 — seluruh
# form yang menyimpan berhenti bekerja sekaligus.
#
# INI PENJAGA UTAMA untuk regresi tersebut, dan sengaja berupa pemeriksaan
# berkas, bukan permintaan HTTP. Pemeriksaan runtime tidak sanggup: memanggil
# Server Action dengan ID tidak sah selalu dijawab 404 — baik saat proxy sehat
# maupun saat rusak — sehingga tidak membedakan apa pun. Sudah diuji dengan
# menyabotase konfigurasi dan menjalankan ulang skrip ini.
mulai 'proxy.conf memakai $http_host, bukan $host'
if grep -q 'proxy_set_header Host \$host;' docker/nginx/proxy.conf; then
    gagal 'masih ada `Host $host` — Server Action akan 500'
else
    lolos
fi

# ---------------------------------------------------------------------------
# 4. Halaman masuk
# ---------------------------------------------------------------------------
mulai 'Halaman masuk terbuka'
KODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$URL/login")"
[ "$KODE" = '200' ] && lolos || gagal "HTTP $KODE"

# ---------------------------------------------------------------------------
# 5. Kesehatan backend
# ---------------------------------------------------------------------------
mulai 'Backend sehat dan database terhubung'
SEHAT="$(docker compose exec -T backend wget -qO- http://127.0.0.1:8000/api/health 2>/dev/null)"
if printf '%s' "$SEHAT" | grep -q '"status":"sehat"' &&
   printf '%s' "$SEHAT" | grep -q '"database":"terhubung"'; then
    lolos
else
    gagal
    catatan "${SEHAT:-tidak ada balasan}"
fi

# ---------------------------------------------------------------------------
# 6. Aset statis dilayani sebagai gambar
# ---------------------------------------------------------------------------
# Matcher middleware yang terlalu luas menjaring berkas `public/` dan
# mengalihkannya ke halaman masuk. Pengoptimal gambar Next.js lalu menerima
# HTML dan menolak dengan 400 — pesannya tidak menyebut pengalihan sama sekali.
mulai 'Berkas public/ dilayani sebagai gambar'
TIPE="$(curl -s -o /dev/null -w '%{content_type}' --max-time 15 "$URL/logo-dams.png")"
KODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$URL/logo-dams.png")"
if [ "$KODE" = '200' ] && printf '%s' "$TIPE" | grep -q '^image/'; then
    lolos
else
    gagal "HTTP $KODE, tipe '${TIPE:-kosong}' — kemungkinan dialihkan middleware"
fi

# ---------------------------------------------------------------------------
# 7. Rute terlindungi tetap dijaga
# ---------------------------------------------------------------------------
# Pasangan pemeriksaan di atas: memperlonggar matcher middleware tidak boleh
# diam-diam membuka halaman yang seharusnya menuntut sesi.
mulai 'Rute terlindungi mengalihkan tanpa sesi'
TERBUKA=''
for r in /dashboard /laporan /analitik /pengaturan /profil /monitoring /progress; do
    K="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$URL$r")"
    [ "$K" = '307' ] || TERBUKA="$TERBUKA $r($K)"
done
[ -z "$TERBUKA" ] && lolos "7 rute" || gagal "tidak dialihkan:$TERBUKA"

# ---------------------------------------------------------------------------
# 8. Masuk lewat Route Handler
# ---------------------------------------------------------------------------
# `/api/*` milik Next.js, bukan Laravel. Mengarahkannya ke backend membuat
# login membalas 404 dan seluruh pemanggilan lain 401.
mulai 'Masuk lewat Route Handler Next.js'
KUKI="$KERANJANG/kuki.txt"
BALASAN="$(curl -s -i -c "$KUKI" --max-time 20 -X POST "$URL/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$SANDI\"}")"
KODE="$(printf '%s' "$BALASAN" | head -1 | awk '{print $2}')"
if [ "$KODE" = '200' ]; then
    lolos
elif [ "$KODE" = '401' ] || [ "$KODE" = '403' ]; then
    # 401 kata sandi tidak cocok, 403 akun dinonaktifkan. Keduanya soal akun uji,
    # bukan kerusakan deployment, dan memperlakukannya sebagai
    # kegagalan biasa justru menyesatkan: seluruh pemeriksaan bersesi di bawahnya
    # ikut merah, dan pembacanya melihat tiga bug padahal sebabnya satu — kata
    # sandi yang sudah diganti lewat aplikasi.
    #
    # Berhenti di sini, dengan menyebut persis apa yang harus dilakukan.
    gagal "HTTP $KODE — akun uji tidak dapat dipakai masuk"
    printf '\n'
    catatan '401 = kata sandi tidak cocok. 403 = akunnya dinonaktifkan.'
    catatan 'Jalankan ulang dengan kredensial yang berlaku:'
    catatan ''
    catatan '  DAMS_UJI_EMAIL=... DAMS_UJI_SANDI=... ./scripts/periksa-deployment.sh'
    printf '\n%s%d gagal%s, %d lolos. Pemeriksaan bersesi tidak dijalankan.\n\n' \
        "$MERAH" "$GAGAL" "$NORMAL" "$LOLOS"
    exit 1
else
    gagal "HTTP $KODE"
    catatan 'Bila 404: proxy mengarahkan /api/ ke backend, bukan ke Next.js.'
fi

# ---------------------------------------------------------------------------
# 9. Flag Secure pada cookie
# ---------------------------------------------------------------------------
# Peramban menolak menyimpan cookie ber-flag Secure di atas http, tanpa suara.
# Login membalas 200, lalu tiap halaman melempar balik ke halaman masuk.
mulai 'Flag Secure cookie cocok dengan skema'
SET_COOKIE="$(printf '%s' "$BALASAN" | grep -i '^set-cookie:' | head -1)"
PUNYA_SECURE=no
printf '%s' "$SET_COOKIE" | grep -qi 'secure' && PUNYA_SECURE=yes
HARUS=no
[ "$COOKIE_SECURE" = 'true' ] && HARUS=yes
if [ -z "$SET_COOKIE" ]; then
    gagal 'tidak ada Set-Cookie'
elif [ "$PUNYA_SECURE" = "$HARUS" ]; then
    if printf '%s' "$SET_COOKIE" | grep -qi 'httponly'; then
        lolos "Secure=$PUNYA_SECURE, HttpOnly ada"
    else
        gagal 'HttpOnly hilang — token terbaca JavaScript'
    fi
else
    gagal "Secure=$PUNYA_SECURE padahal DAMS_COOKIE_SECURE=$COOKIE_SECURE"
fi

# ---------------------------------------------------------------------------
# 10. Endpoint Server Action hidup
# ---------------------------------------------------------------------------
# ID sengaja dibuat tidak sah supaya tidak ada action sungguhan yang terpanggil
# — memanggil action acak dapat mengubah atau menghapus data.
#
# Batasnya perlu diketahui: pemeriksaan ini TIDAK menangkap ketidakcocokan
# Origin akibat `$host` di proxy, sebab ID yang tidak sah ditolak lebih dulu
# dan jawabannya tetap 404 walau gerbangnya rusak. Yang menjaga regresi itu
# pemeriksaan nomor 3. Yang tertangkap di sini adalah kerusakan yang lebih
# kasar: endpoint Server Action yang 500 untuk semua permintaan.
mulai 'Endpoint Server Action hidup'
KODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 -b "$KUKI" \
    -X POST "$URL/profil" \
    -H "Origin: $URL" \
    -H 'Next-Action: 00000000000000000000000000000000000000' \
    -H 'Content-Type: text/plain;charset=UTF-8' --data '[]')"
if [ "$KODE" = '500' ]; then
    gagal 'HTTP 500 — Origin tidak cocok dengan host yang diteruskan proxy'
    catatan 'Setiap form yang menyimpan lewat Server Action ikut gagal.'
else
    lolos "HTTP $KODE"
fi

# ---------------------------------------------------------------------------
# 11. Nilai Reverb tertanam di bundel
# ---------------------------------------------------------------------------
# NEXT_PUBLIC_* ditanam saat build dengan mengganti teks ekspresi statis.
# Membacanya lewat pembungkus membuat tidak ada yang tertanam, dan seluruh
# nilai jatuh ke bawaan pengembangan lokal tanpa satu pun pesan galat.
mulai 'Kunci Reverb asli tertanam di bundel'
if [ -z "$KUNCI_REVERB" ]; then
    gagal 'REVERB_APP_KEY kosong di .env'
elif docker compose exec -T frontend sh -c "grep -rq '$KUNCI_REVERB' .next/static/" 2>/dev/null; then
    if docker compose exec -T frontend sh -c "grep -rq 'dams-lokal' .next/static/" 2>/dev/null; then
        gagal 'kunci asli ada, tetapi nilai bawaan "dams-lokal" masih ikut terbawa'
    else
        lolos
    fi
else
    gagal 'bundel memakai nilai bawaan — build ulang frontend dengan build arg yang benar'
fi

mulai 'Alamat Reverb publik tertanam di bundel'
if docker compose exec -T frontend sh -c "grep -rq '$HOST_REVERB' .next/static/" 2>/dev/null; then
    lolos "$HOST_REVERB"
else
    gagal "'$HOST_REVERB' tidak ditemukan di bundel"
fi

# ---------------------------------------------------------------------------
# 12. WebSocket lewat pintu
# ---------------------------------------------------------------------------
mulai 'Jabat tangan WebSocket lewat pintu'
WS="$(curl -s -i --max-time 12 -N \
    -H 'Connection: Upgrade' -H 'Upgrade: websocket' \
    -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H 'Sec-WebSocket-Version: 13' \
    "$URL/app/$KUNCI_REVERB?protocol=7&client=js&version=8.4.0" 2>/dev/null | head -1)"
if printf '%s' "$WS" | grep -q '101'; then
    lolos '101 Switching Protocols'
else
    gagal "${WS:-tidak ada balasan}"
fi

# ---------------------------------------------------------------------------
# 13. Otorisasi channel privat
# ---------------------------------------------------------------------------
mulai 'Otorisasi channel privat'
ID_SAYA="$(curl -s --max-time 15 -b "$KUKI" "$URL/api/notifikasi" >/dev/null 2>&1; \
    docker compose exec -T db sh -c \
    "mysql -u root -p\"\$MYSQL_ROOT_PASSWORD\" -N -e \
    'SELECT id FROM dams_db.users WHERE email=\"$EMAIL\" LIMIT 1;'" 2>/dev/null | tr -d '[:space:]')"
if [ -z "$ID_SAYA" ]; then
    gagal 'tidak dapat menentukan id pengguna uji'
else
    OK_SENDIRI="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -b "$KUKI" \
        -X POST "$URL/api/broadcasting/auth" \
        -H 'Content-Type: application/x-www-form-urlencoded' \
        -d "socket_id=1.1&channel_name=private-App.Models.User.$ID_SAYA")"
    OK_ORANG="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -b "$KUKI" \
        -X POST "$URL/api/broadcasting/auth" \
        -H 'Content-Type: application/x-www-form-urlencoded' \
        -d "socket_id=1.1&channel_name=private-App.Models.User.99999999")"
    if [ "$OK_SENDIRI" = '200' ] && [ "$OK_ORANG" = '403' ]; then
        lolos "sendiri 200, orang lain 403"
    else
        gagal "sendiri $OK_SENDIRI (harus 200), orang lain $OK_ORANG (harus 403)"
    fi
fi

# ---------------------------------------------------------------------------
# 14. Unggahan mendarat di host
# ---------------------------------------------------------------------------
# Bila jalur mount salah tulis, Docker membuat direktori kosong baru, aplikasi
# berjalan normal, dan lampiran tersimpan di tempat yang tidak pernah
# dicadangkan (ADR-009).
mulai 'Berkas unggahan mendarat di penyimpanan host'
JALUR_HOST="$(nilai_env DAMS_STORAGE_PATH)"
JALUR_HOST="${JALUR_HOST:-/mnt/raw-backup/app_data_storage/hbm-daily-activity}"
PENANDA="uji-periksa-$$"
if docker compose exec -T -u www-data backend sh -c "echo uji > storage/app/$PENANDA" 2>/dev/null &&
   [ -f "$JALUR_HOST/storage-app/$PENANDA" ]; then
    lolos "$JALUR_HOST/storage-app"
else
    gagal "tidak muncul di $JALUR_HOST/storage-app"
fi
docker compose exec -T -u www-data backend sh -c "rm -f storage/app/$PENANDA" 2>/dev/null

# ---------------------------------------------------------------------------
# 15. Antrean memproses job
# ---------------------------------------------------------------------------
# Notifikasi dan export dikerjakan lewat antrean. Tanpa worker yang benar-benar
# memproses, keduanya diam tanpa satu pun pesan galat.
mulai 'Worker antrean memproses job'
# Penandanya nama berkas, bukan isi Log::warning. Worker menuliskan nama
# closure beserta berkas asalnya ke stdout — yang tertangkap `docker compose
# logs` — sedangkan Log::warning mendarat di berkas log di dalam container dan
# tidak terlihat dari luar sama sekali.
TANDA="ujiperiksa$$"
docker compose exec -T backend sh -c "cat > /tmp/$TANDA.php <<'PHP'
<?php
require '/var/www/html/vendor/autoload.php';
\$app = require '/var/www/html/bootstrap/app.php';
\$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
dispatch(function () {
    // Sengaja tidak berbuat apa-apa: yang diuji jalur antreannya, bukan isinya.
});
PHP
php /tmp/$TANDA.php && rm -f /tmp/$TANDA.php" >/dev/null 2>&1
DIPROSES=no
for _ in 1 2 3 4 5 6 7 8 9 10; do
    sleep 1
    if docker compose logs queue --since 120s 2>/dev/null | grep -q "$TANDA"; then
        DIPROSES=yes
        break
    fi
done
[ "$DIPROSES" = 'yes' ] && lolos || gagal 'job tidak terproses dalam 10 detik'

# ---------------------------------------------------------------------------
# 16. mysqldump dapat menyambung
# ---------------------------------------------------------------------------
# Klien MariaDB tanpa paket plugin ditolak MySQL 8 yang memakai
# caching_sha2_password. Cadangan terjadwal gagal tiap malam, dan gagalnya baru
# terasa saat cadangan itu dibutuhkan.
mulai 'Cadangan basis data benar-benar dapat dibuat'
# Menjalankan perintah yang sesungguhnya, bukan merakit ulang pemanggilan
# mysqldump sendiri. Rakitan sendiri pernah gagal karena beda flag sementara
# perintah aslinya berhasil — yang diuji jadi bukan sistemnya, melainkan
# skrip ini. Berkas yang lahir langsung dihapus agar tidak menumpuk.
KELUARAN_BACKUP="$(docker compose exec -T backend php artisan dams:backup --tanpa-pangkas 2>&1)"
BERKAS_BACKUP="$(printf '%s' "$KELUARAN_BACKUP" | grep -oE 'dams_db_[0-9_]+\.sql' | head -1)"
if [ -n "$BERKAS_BACKUP" ]; then
    lolos "$BERKAS_BACKUP"
    docker compose exec -T backend sh -c "rm -f /var/backup/dams/$BERKAS_BACKUP" 2>/dev/null
else
    gagal
    printf '%s' "$KELUARAN_BACKUP" | grep -iE 'error|gagal' | head -2 | while read -r b; do catatan "$b"; done
fi

# ---------------------------------------------------------------------------
printf '\n'
if [ "$GAGAL" -eq 0 ]; then
    printf '%s%d lolos, 0 gagal.%s Deployment sehat.\n\n' "$HIJAU" "$LOLOS" "$NORMAL"
    exit 0
fi

printf '%s%d gagal%s, %d lolos.\n\n' "$MERAH" "$GAGAL" "$NORMAL" "$LOLOS"
exit 1
