# Panduan Deployment DAMS

Sasaran: server **10.10.10.201**, dijalankan dengan Docker Compose.

| Fase | Alamat | TLS |
|---|---|---|
| QA production | `http://36.92.42.135:13080` | tidak |
| Production | `https://daily.hbmnet.co.id` | ya, diterminasi proxy |

---

## 1. Yang harus diperiksa lebih dulu

Belum diverifikasi saat dokumen ini ditulis. Jalankan di server, dan sesuaikan
`.env` beserta `docker-compose.yml` bila hasilnya berbeda dari asumsi di sini.

```bash
# Docker tersedia dan versinya cukup baru
docker --version && docker compose version

# Port DAMS harus bebas. Yang dipublikasikan: 13001 13002 13003 13080 13443
# 13306 13379
ss -tulpn | grep -E ':(13001|13002|13003|13080|13443|13306|13379)\b'

# Sumber daya. Menentukan jumlah worker dan apakah MySQL layak seruangan
nproc && free -h && df -h /var/lib/docker
```

**Asumsi yang dipakai berkas Compose:**

* MySQL dan Redis dijalankan sebagai container DAMS sendiri, bukan memakai
  yang sudah ada di server. Bila server sudah punya MySQL yang dipakai bersama,
  hapus layanan `db` dan arahkan `DB_HOST` ke sana — jangan menaruh dua MySQL
  di satu mesin tanpa alasan.
* Tidak ada reverse proxy lain di depan. Bila server sudah punya nginx yang
  melayani domain lain, layanan `proxy` tidak dipakai; arahkan nginx yang ada
  ke port 13001, 13002, dan 13003 dengan aturan yang sama seperti
  `docker/nginx/proxy.conf`.

---

## 2. Susunan layanan

```
                         proxy (13080/13443)
                            |
        +-------------------+-------------------+
        |                   |                   |
   frontend:3000       backend:8000        reverb:8080
   (Next.js)           (PHP-FPM+nginx)     (WebSocket)
        |                   |                   |
        +-------------------+-------------------+
                            |
                    db:3306      redis:6379
                            |
                       queue (worker)
```

Reverb container tersendiri, bukan proses tambahan di dalam backend. Sambungan
WebSocket berumur panjang, sedangkan container backend dimatikan dan dinyalakan
ulang tiap deployment — memisahkannya membuat penyebaran ulang backend tidak
memutus sambungan semua orang.

---

## 3. Alamat Reverb: dua yang berbeda

Ini sumber kekeliruan yang paling sering, karena namanya mirip.

| Variabel | Dibaca siapa | Nilainya |
|---|---|---|
| `REVERB_HOST` | Backend, saat **mengirim** siaran | `reverb` (nama container) |
| `REVERB_SERVER_HOST` | Reverb, saat **mengikat** port | `0.0.0.0` |
| `REVERB_PUBLIC_HOST` | Peramban, saat **menyambung** | domain atau IP publik |

`REVERB_PUBLIC_*` ditanam ke bundel JavaScript **saat build**. Mengubahnya di
`.env` lalu me-restart container tidak berpengaruh sama sekali — frontend harus
dibangun ulang:

```bash
docker compose build frontend && docker compose up -d frontend
```

Peramban menyambung lewat proxy yang sama dengan aplikasinya
(`wss://daily.hbmnet.co.id/app/<kunci>`), bukan ke port 13003. Satu sertifikat,
satu asal, dan tidak ada port tambahan yang harus dibuka di firewall. Port
13003 dipublikasikan hanya untuk pemeriksaan langsung saat menyelidiki masalah.

---

## 4. Deployment pertama

```bash
git clone <repo> dams && cd dams
cp .env.example .env
```

Isi `.env`. Yang **wajib** dan tidak boleh memakai nilai contoh:

```bash
# Kunci aplikasi
docker compose run --rm backend php artisan key:generate --show
# tempelkan hasilnya ke APP_KEY

# Kredensial database dan Reverb — acak, jangan diketik sendiri
openssl rand -hex 24   # DB_PASSWORD
openssl rand -hex 24   # DB_ROOT_PASSWORD
openssl rand -hex 16   # REVERB_APP_KEY
openssl rand -hex 32   # REVERB_APP_SECRET
```

Yang memegang `REVERB_APP_SECRET` dapat menyiarkan ke channel mana pun. Nilai
itu tidak pernah dibawa ke peramban.

Lalu:

```bash
docker compose build
docker compose up -d db redis
docker compose up -d backend reverb queue frontend proxy

# Skema dan data awal — LANGKAH TERSENDIRI, bukan otomatis
docker compose exec backend php artisan migrate --force
docker compose exec backend php artisan db:seed --force
```

Seeder membuat akun administrator awal dari `DAMS_ADMIN_EMAIL` dan
`DAMS_ADMIN_PASSWORD`. Tanpa keduanya, seeder menolak berjalan di production.

---

## 5. Deployment berikutnya

Urutannya mengikat (non-fungsional §30). **Backup mendahului migration, bukan
sesudahnya** — setelah migration berjalan, tidak ada lagi yang bisa
dikembalikan.

```bash
# 1. Build
git pull && docker compose build

# 2. Test — di mesin pengembangan, sebelum menyentuh server
#    cd backend && php artisan test
#    cd frontend && npx tsc --noEmit && npx eslint . && npx vitest run

# 3. BACKUP, dan pastikan berkasnya benar-benar ada dan berisi
docker compose exec -T db mysqldump -u root -p"$DB_ROOT_PASSWORD" \
    --single-transaction --routines --triggers dams_db \
    | gzip > "backup-$(date +%Y%m%d-%H%M).sql.gz"
ls -lh backup-*.sql.gz | tail -1

# 4. Deploy
docker compose up -d

# 5. Migration
docker compose exec backend php artisan migrate --force

# 6. Health check
curl -fsS http://127.0.0.1:13002/api/health
curl -fsS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:13001/login

# 7. Verify — masuk, buka satu laporan, pastikan lonceng notifikasi tersambung
```

### Larangan

`migrate:fresh`, `migrate:refresh`, `migrate:reset`, dan `db:wipe` **dilarang**
tanpa izin eksplisit pemilik project, untuk setiap kejadian. Rinciannya di
`docs/adr/ADR-008-larangan-fresh-migrate.md`.

---

## 6. Jumlah worker

Disetel lewat `PHP_FPM_MAX_CHILDREN` di `.env`, dibaca
`docker/php/pool.conf` saat container berjalan — tidak perlu membangun ulang
image untuk mengubahnya.

Bawaan image `php-fpm` hanya 5 proses. Satu halaman DAMS menembak tiga
panggilan API bersamaan, jadi dua pengguna yang membuka halaman pada saat yang
sama sudah menghabiskan jatahnya. Karena itu nilainya dinaikkan menjadi 8.

Patokannya RAM, bukan core: tiap proses menahan satu aplikasi Laravel penuh,
sekitar 40–80 MB. Server 4 GB dengan MySQL seruangan cukup dengan 8; naikkan
sambil mengawasi `docker stats`. Melebihi RAM membuat server bertukar ke disk,
dan itu jauh lebih lambat daripada antre.

---

## 7. TLS untuk production

Sertifikat diletakkan di `docker/certs/` dan dibaca proxy sebagai volume
baca-saja. Bila memakai Let's Encrypt, perbarui sertifikatnya di host lalu:

```bash
docker compose exec proxy nginx -s reload
```

Muat ulang, bukan restart — restart memutus seluruh sambungan WebSocket yang
sedang berjalan.

---

## 8. Yang belum dikerjakan

Ditulis terbuka supaya tidak terlewat:

* **Backup terjadwal belum ada.** Perintah pada §5 dijalankan manual. Cron
  harian beserta retensi dan penyimpanan di luar server utama belum disiapkan.
* **Uji restore belum pernah dilakukan.** Backup yang tidak pernah dipulihkan
  belum tentu backup.
* **Pemantauan belum ada** — error rate, antrean yang menumpuk, container yang
  mati dan hidup lagi berulang.
* **Sertifikat TLS** belum disiapkan; `docker/certs/` masih kosong.
