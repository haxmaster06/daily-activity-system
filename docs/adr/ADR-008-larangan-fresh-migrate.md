# ADR-008 — Larangan Fresh Migrate Tanpa Izin

**Status:** Diterima
**Tanggal:** 30 Juli 2026

## Context

Server MySQL yang dipakai pengembangan DAMS menampung puluhan database project lain milik perusahaan (`erp_hbm_db`, `hbm_pos_db`, `sisfo_hbm`, dan lainnya). Perintah reset skema Laravel bekerja diam-diam dan tidak bisa dibatalkan: `migrate:fresh` menjatuhkan seluruh tabel di database aktif sebelum menjalankan ulang migration.

Di lingkungan yang dipakai bersama, satu perintah salah sasaran menghapus data produksi milik project lain, atau data laporan harian yang sudah diisi user dan tidak punya salinan.

Selain itu DAMS memakai template laporan dinamis yang dikonfigurasi admin lewat UI. Data konfigurasi itu hidup di database, bukan di kode — reset skema berarti kehilangan konfigurasi yang tidak ada di repository.

## Decision

Perintah berikut dilarang dijalankan tanpa izin eksplisit pemilik project untuk setiap kejadian:

```
php artisan migrate:fresh
php artisan migrate:fresh --seed
php artisan migrate:refresh
php artisan migrate:reset
php artisan db:wipe
```

Larangan yang sama berlaku untuk `DROP DATABASE`, `TRUNCATE`, dan `DELETE` tanpa `WHERE` lewat klien SQL mana pun.

Konsekuensi teknis yang mengikat:

1. Perubahan skema selalu additive — migration baru, bukan menyunting migration yang sudah dijalankan.
2. Backup database dijalankan sebelum `php artisan migrate` di environment mana pun selain database lokal sekali pakai.
3. Tiap migration wajib punya `down()` yang benar-benar bisa di-rollback.
4. Penghapusan kolom dua tahap: berhenti memakai kolom lalu rilis, drop di rilis berikutnya.
5. Seeder master data idempotent (`updateOrCreate`), tidak pernah `truncate`.
6. Test suite memakai database terpisah `dams_db_testing`; konfigurasi test tidak boleh menunjuk ke `dams_db`.

## Alternatives

**Mengandalkan kedisiplinan tanpa aturan tertulis.** Ditolak — perintah reset adalah jalan tercepat saat migration bentrok, sehingga akan dipakai di bawah tekanan waktu.

**Memberi user database hak akses terbatas tanpa `DROP`.** Menarik dan tetap layak diterapkan sebagai lapisan tambahan, tetapi tidak menutup Laragon root yang dipakai developer sehari-hari. Tidak menggantikan aturan ini.

**Reset bebas di lokal, dilarang di staging/produksi.** Ditolak — database lokal memakai server yang sama dengan project lain, dan konfigurasi template hasil kerja manual ada di lokal.

## Consequences

Positif: data laporan dan konfigurasi template aman; riwayat migration jadi dokumen evolusi skema yang bisa dibaca; rollback selalu tersedia.

Negatif: saat migration bentrok, penyelesaiannya lebih lambat karena harus menulis migration perbaikan, bukan reset. Skema pada database lama bisa menyimpan sisa kolom yang sudah tidak dipakai sampai rilis pembersihannya tiba.

Aturan ini ditulis ulang di `CLAUDE.md` agar terbaca tiap sesi agent.
