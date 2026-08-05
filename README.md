# DAMS — Daily Activity Monitoring System

Aplikasi web internal **CV Hasil Barokah Mandiri** untuk menggantikan Daily
Report berbasis Excel dan Word.

Tiap departemen mengisi laporan harian lewat template kolomnya sendiri —
Produksi bicara kilogram dan nomor LOT, Exim bicara EMKL dan kelengkapan
dokumen — dan pimpinan membaca ringkasannya di satu tempat, tanpa membuka dua
puluh berkas yang bentuknya berbeda-beda.

Seluruh antarmuka berbahasa Indonesia. Begitu pula nama fungsi, variabel, dan
komentar di dalam kode.

---

## Isi repositori

```
backend/     Laravel 12 — REST API, 70+ endpoint
frontend/    Next.js 15 — App Router, Server Component
docker/      Dockerfile, konfigurasi nginx dan PHP
docs/        Dokumen yang mengikat (lihat daftar di bawah)
mockup/      Mockup UI/UX yang sudah disetujui
```

---

## Fitur

| Bagian | Isi |
|---|---|
| **Laporan harian** | Template dinamis per departemen, pengisian mode grid maupun per baris, lampiran, draf otomatis |
| **Tinjauan** | Supervisor meninjau laporan timnya beserta catatan |
| **Papan progres** | Kanban tarik-lepas, dapat dijalankan penuh dengan papan ketik |
| **Executive Analytics** | Empat tab, grafik yang dapat ditekan untuk menyaring, mengikuti perubahan data secara seketika |
| **Monitoring** | Siapa sudah dan belum mengisi hari ini, beserta pengingat |
| **Export** | Excel, PDF, dan Cetak — selalu didahului pratinjau |
| **Import** | Daftar master dan laporan harian, dengan pratinjau per baris sebelum tersimpan |
| **Master data** | Departemen, template, kolom, daftar nilai, pengguna, peran |
| **Notifikasi** | Didorong lewat WebSocket; dapat ditandai dibaca, dihapus, dan dibersihkan |
| **Profil** | Foto profil dengan pemotong gambar, kartu identitas 3D |

---

## Menjalankan di mesin pengembangan

Prasyarat: PHP 8.3+, Composer, Node.js 20+, MySQL 8, Redis (opsional).

```bash
# Sekali saja
cd backend  && composer install && cp .env.example .env && php artisan key:generate
cd frontend && npm install

php artisan migrate
php artisan db:seed
```

Menyalakan seluruh server sekaligus (Windows, tanpa Docker):

```
JALANKAN_DAMS.bat
```

Membuka empat tab — API, queue worker, scheduler, dan frontend — sesudah
memeriksa dependency, `APP_KEY`, dan MySQL.

Per bagian:

```bash
cd backend  && php artisan serve --port=13002
cd backend  && php artisan queue:work        # notifikasi dan siaran realtime
cd backend  && php artisan schedule:work     # backup terjadwal
cd frontend && npm run dev                   # port 13001
```

> **Queue worker bukan pilihan.** Notifikasi dan pembaruan seketika halaman
> Analytics dikirim lewat antrean. Tanpa worker yang hidup, keduanya diam tanpa
> satu pun pesan galat.

### Port

| Layanan | Port |
|---|---|
| Frontend Next.js | 13001 |
| Backend API | 13002 |
| Reverb (WebSocket) | 13003 |
| MySQL | 13306 (Docker) / 3306 (Laragon) |
| Redis | 13379 (Docker) / 6379 (lokal) |
| Reverse proxy | 13080 |
| HTTPS gateway | 13443 |

---

## Pemeriksaan sebelum commit

```bash
cd backend  && php artisan test && ./vendor/bin/pint --test
cd frontend && npx tsc --noEmit && npx eslint . && npx vitest run
```

Keadaan saat ini: **400 test backend**, **203 test frontend**.

---

## Deployment

Docker Compose, seluruh portnya di rentang 13xxx agar tidak bentrok dengan
layanan lain di server yang dipakai bersama.

```bash
cp .env.example .env      # lalu isi seluruh nilai yang kosong
docker compose build
docker compose up -d
docker compose exec backend php artisan migrate --force
```

Berkas unggahan — lampiran, foto profil, export, dan cadangan basis data —
disimpan **di host** pada `/mnt/raw-backup/app_data_storage/hbm-daily-activity`,
bukan di dalam Docker. Alasannya dan langkah penyiapannya ada di
`docs/panduan-deployment.md` §3b.

Langkah lengkap, termasuk urutan backup sebelum migration:
**`docs/panduan-deployment.md`**.

---

## ⚠️ Dua aturan yang tidak boleh dilanggar

### 1. Dilarang mereset basis data

```
php artisan migrate:fresh      migrate:refresh      migrate:reset
php artisan db:wipe            DROP DATABASE        TRUNCATE
```

Server MySQL yang dipakai berisi basis data project lain. Perubahan skema
**selalu additive** — buat migration baru, jangan menyunting yang sudah pernah
dijalankan. Tiap migration wajib punya `down()` yang benar-benar dapat
di-rollback, dan seeder master data wajib idempotent (`updateOrCreate`).

Rinciannya: `docs/adr/ADR-008-larangan-fresh-migrate.md`.

### 2. `Klien_Data/` tidak pernah masuk repositori

Berkas Excel dan Word dari klien memuat nama karyawan, nama supplier, nomor LOT
dan tonase produksi, nama petani binaan, serta nomor PO pelanggan. Repositori
ini publik. Folder tersebut ada di `.gitignore` dan diletakkan manual di mesin
pengembang.

Isinya tidak pernah disalin ke dalam kode, komentar, seeder, test, atau pesan
commit.

---

## Dokumen

Dibaca **sebelum** mengubah apa pun. Bukan referensi opsional — sebagian
memuat larangan yang mengikat.

| Dokumen | Isi |
|---|---|
| `docs/PRD/PRD.md` | Scope, fitur, rancangan basis data |
| `docs/standar-ui-ux.md` | Standar UI/UX yang mengikat. Menang atas standarisasi bila bertentangan |
| `docs/standar-library-ui.md` | Library tiap komponen, dan alasan tiap library pihak ketiga |
| `docs/api.md` | Daftar endpoint, envelope, dua lapis penjagaan, penyaring Analytics |
| `docs/panduan-pengguna.md` | Panduan pemakaian untuk karyawan |
| `docs/panduan-deployment.md` | Deployment Docker, penyimpanan berkas, urutan backup |
| `docs/template-departemen.md` | Skema kolom template tiap departemen |
| `docs/tinjauan-index.md` | Hasil EXPLAIN dan alasan tiap index |
| `docs/adr/` | Keputusan arsitektur yang mengikat |
| `.agents/Standarization/` | Standarisasi UI/UX dan kebutuhan non-fungsional |

---

## Arsitektur singkat

**Peramban tidak pernah memanggil backend secara langsung.** Token Sanctum
berada di cookie httpOnly yang tidak dapat dibaca JavaScript; Next.js Route
Handler yang membawanya.

**Otorisasi deny by default.** Jangkauan data laporan dipusatkan di
`DailyReport::scopeVisibleTo()` dan `Tugas::scopeVisibleTo()` — pengecekan peran
ad-hoc di controller dilarang, sebab aturan yang tersebar pasti berbeda di salah
satunya, dan yang berbeda itu menjadi kebocoran data.

**Seluruh response memakai satu envelope:**

```json
{ "success": true, "message": "", "data": {} }
```
