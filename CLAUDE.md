# DAMS — Daily Activity Monitoring System

Aplikasi web internal CV Hasil Barokah Mandiri untuk menggantikan Daily Report berbasis Excel/Word.

Monorepo: `backend/` (Laravel 12 REST API) + `frontend/` (Next.js 15) + `docker/`.

Dokumen acuan yang wajib dibaca sebelum mengubah apa pun:

| Dokumen | Isi |
|---|---|
| `docs/PRD/PRD.md` | Scope, fitur, database design dasar |
| `.agents/Standarization/standarization.md` | Standar UI/UX — mengikat tiap halaman |
| `docs/standar-ui-ux.md` | **Standar UI/UX mengikat** — input, tab, wizard, animasi, navigasi, tabel, form. Menang atas standarisasi bila bertentangan |
| `docs/standar-library-ui.md` | Library tiap komponen: Radix, React Aria, shadcn, React Bits |
| `docs/template-departemen.md` | Skema kolom template laporan per departemen |
| `.agents/Standarization/non-fungsional-requirement.md` | Security, performance, testing, deployment |
| `Klien_Data/Requirement1.docx` | Kolom tabel per departemen (sumber kebenaran template) — **tidak ada di repo**, lihat catatan di bawah |
| `mockup/UI UX Mockup/` | Mockup yang sudah disetujui — implementasi wajib mengikuti |

**`Klien_Data/` sengaja tidak ada di repository.** Berkas Excel dan Word dari
klien memuat nama karyawan, nama supplier, nomor LOT dan tonase produksi, nama
petani binaan, serta nomor PO pelanggan. Repository ini publik, sehingga folder
tersebut masuk `.gitignore` dan tidak pernah di-commit. Berkasnya diletakkan
manual di `Klien_Data/` pada mesin pengembang. Jangan pernah menyalin isinya —
nama orang, nama supplier, angka produksi — ke dalam kode, komentar, seeder,
test, atau pesan commit.

---

## ⚠️ ATURAN MIGRASI DATABASE — TIDAK BOLEH DILANGGAR

**Dilarang menjalankan perintah berikut tanpa izin eksplisit pemilik project, untuk setiap kejadian:**

```
php artisan migrate:fresh
php artisan migrate:fresh --seed
php artisan migrate:refresh
php artisan migrate:reset
php artisan db:wipe
```

Larangan ini juga berlaku untuk `DROP DATABASE`, `TRUNCATE`, dan `DELETE` tanpa `WHERE` lewat klien SQL apa pun.

Ketentuan:

* Perubahan skema **selalu additive** — buat migration baru. Jangan mengubah file migration yang sudah pernah dijalankan.
* Sebelum `php artisan migrate` di environment selain database lokal sekali pakai: **backup dulu**, simpan hasilnya di luar server utama.
* Tiap migration wajib punya `down()` yang benar-benar bisa di-rollback.
* Menghapus kolom/tabel dua tahap: (1) berhenti memakai kolom, rilis; (2) migration drop di rilis berikutnya.
* Seeder master data wajib **idempotent** (`updateOrCreate`). Tidak pernah `truncate`.
* Server MySQL yang dipakai berisi banyak database project lain. Sentuh hanya `dams_db` dan `dams_db_testing`.

Referensi: `docs/adr/ADR-008-larangan-fresh-migrate.md`.

---

## Aturan Bahasa

* Seluruh teks yang dilihat user memakai **Bahasa Indonesia**.
* Tanpa jargon teknis: Kirim (bukan Submit), Hapus (bukan Delete), Perbarui (bukan Update), Batal (bukan Cancel), Setujui (bukan Approve), Draf (bukan Draft).
* Nama kolom database tidak boleh bocor jadi label layar — `progress_status` ditampilkan sebagai "Status".
* Tanggal: `30 Juli 2026`. Waktu: 24 jam pemisah titik, `08.15 WIB`.
  * Frontend lewat `frontend/src/lib/format.ts` — jangan panggil `toLocaleDateString` langsung.
  * Backend lewat Carbon `translatedFormat` dengan locale `id`.
  * Dikecualikan (tetap teknis): nama berkas (`Ymd`), payload API (ISO 8601), kunci data (`Y-m`).
* Pesan error ke user: kalimat ramah + kode referensi (`ERR-20260730-001`). Detail teknis hanya ke log.

## Aturan UI/UX

Sumber lengkap: `.agents/Standarization/standarization.md`. Ringkasan yang paling sering dilanggar:

* **Horizontal Top Navigation Bar**. Dilarang memakai permanent sidebar.
* Breadcrumb dapat diklik di tiap halaman fitur, memakai komponen bersama.
* **Light mode saja.** Tidak ada dark mode.
* Body text 12–14px. Tinggi input 32–40px. Input tidak berlatar abu-abu default.
* Form ≤ 8 field pakai modal; > 8 field atau ada lampiran pakai halaman tersendiri.
* Tabel: header sticky, tinggi dibatasi ~11 baris, hanya badan yang menggulir, pagination + filter dikerjakan server.
* `truncate` dilarang untuk isi bermakna. Halaman tidak boleh menggulir horizontal.
* Badge status: warna konsisten di seluruh aplikasi, selalu disertai ikon atau teks (bukan warna saja).
* Export **preview-first** — tidak ada unduh langsung.
* Tanpa gradient dekoratif, card berlebihan, rounded acak, atau deskripsi pengisi ruang.
* Data yang punya master data memakai Select atau Autocomplete — bukan ketik bebas.
  Isian turunan diisi otomatis. Rinciannya di `docs/standar-ui-ux.md`.
* Isi setara yang banyak dikelompokkan dengan Tab; isian berantai memakai Wizard.
* Animasi **halus dan secukupnya** — nilai gerak di `frontend/src/lib/gerak.ts`.
  Menggantikan pembatasan animasi minimal pada standarisasi §12.
* **Seluruh komponen UI memakai Radix UI atau React Aria.** MUI tidak dipakai.
  Peta komponen lengkap ada di `docs/standar-library-ui.md` §2.

## Aturan API

Semua response memakai envelope:

```json
{ "success": true, "message": "", "data": {} }
```

Tiap endpoint wajib punya: authentication, authorization (Policy), input validation (Form Request), dan rate limit bila relevan.

Otorisasi memakai prinsip **deny by default**. Scope data laporan dipusatkan di `DailyReport::scopeVisibleTo()` — jangan menulis pengecekan role ad-hoc di controller.

## Perintah

Menyalakan seluruh server pengembangan sekaligus (Windows, native, tanpa Docker):

```
JALANKAN_DAMS.bat
```

Membuka empat tab: API, queue worker, scheduler, dan frontend. Skrip memeriksa
dependency, `APP_KEY`, dan MySQL Laragon sebelum menyalakan apa pun, serta
membebaskan port 13001/13002. Port 3306 tidak pernah disentuh karena dipakai
bersama project lain.

Menjalankan per bagian:

```bash
# Backend
cd backend
php artisan serve --port=13002
php artisan test
./vendor/bin/pint

# Frontend
cd frontend
npm run dev        # port 13001
npm run test
npm run lint
npm run build
```

## Port

| Service | Port |
|---|---|
| Frontend Next.js | 13001 |
| Backend Laravel API | 13002 |
| MySQL | 13306 (Docker) / 3306 (lokal Laragon) |
| Redis | 13379 (Docker) / 6379 (lokal) |
| Reverse Proxy | 13080 |
| HTTPS Gateway | 13443 |
