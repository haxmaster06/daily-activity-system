# ADR-005 — Autentikasi Sanctum, Token di Cookie httpOnly

**Status:** Diterima
**Tanggal:** 5 Agustus 2026 (mencatat keputusan yang sudah dijalankan sejak awal project)

## Context

DAMS aplikasi internal satu perusahaan. Tidak ada pihak ketiga yang perlu
mengakses datanya, dan tidak ada kebutuhan masuk lewat penyedia identitas luar.

Frontend berupa aplikasi Next.js tersendiri (ADR-002), sehingga sesi berbasis
cookie milik Laravel tidak berlaku begitu saja — tidak ada permintaan yang
datang dari asal yang sama.

Perangkat di area produksi dipakai bergantian, dan atas permintaan pemilik
project keluar otomatis dimatikan: pengisi laporan panjang pernah terlempar
keluar dan kehilangan isiannya (`config/dams.php`).

## Decision

Laravel Sanctum dengan **personal access token**, disimpan pada cookie
`httpOnly` milik domain frontend.

Konsekuensi teknis yang mengikat:

1. **Token tidak pernah tersentuh JavaScript peramban.** Seluruh panggilan API
   melewati sisi server Next.js, yang membaca cookie lalu memasang header
   `Authorization` (`frontend/src/lib/api.ts`).
2. Tiap endpoint yang menyentuh data memakai `auth:sanctum` **dan** Policy —
   deny by default. Izin menentukan *apakah* boleh; `scopeVisibleTo()`
   menentukan *data mana*. Keduanya wajib.
3. `sanctum.expiration` dimatikan. Batas mutlak sejak `created_at` memutus
   pengguna yang sedang bekerja, tepat pada jam yang paling merepotkan.
4. Sesi yang berakhir **tidak** menampilkan halaman galat: cookie basi dibuang
   dan pengguna diantar ke halaman masuk disertai penjelasan.

## Alternatives

**Sesi berbasis cookie Laravel dengan Sanctum SPA mode.** Ditolak. Menuntut
frontend dan backend berbagi domain induk beserta pengaturan CSRF dan CORS yang
harus benar di tiga tempat; token bearer di balik cookie `httpOnly` memberi
perlindungan yang sama dengan bagian yang jauh lebih sedikit untuk salah.

**JWT tanpa keadaan.** Ditolak. Token yang tidak dapat dicabut adalah masalah
justru pada aplikasi ini: menonaktifkan akun harus berlaku seketika. Token
Sanctum tersimpan di basis data, sehingga menonaktifkan akun atau mengatur ulang
kata sandi membuang seluruh tokennya.

**Penyedia identitas luar.** Ditolak untuk sekarang. Tidak ada direktori
identitas perusahaan yang siap dipakai.

## Consequences

Positif: token tidak dapat dicuri lewat skrip di halaman. Pencabutan berlaku
seketika. Bagian yang harus benar sedikit.

Negatif — dan ini yang perlu diketahui pemilik project: **token yang tidak
pernah kedaluwarsa tetap berlaku selamanya bila tercuri**, dan perangkat yang
dipakai bergantian meninggalkan sesi terbuka bagi pemakai berikutnya bila yang
sebelumnya lupa menekan Keluar. Cara mencabutnya: nonaktifkan akunnya, atau
atur ulang kata sandinya.

Batas waktu dapat dihidupkan kembali tanpa perubahan kode dengan mengisi
`DAMS_SESI_MENIT` lebih dari nol.
