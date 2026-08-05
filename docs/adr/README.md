# Architecture Decision Record

Keputusan arsitektur yang mengikat, beserta alasannya. Dibaca sebelum mengubah
hal yang disebut di dalamnya — dan diubah lewat ADR baru, bukan dengan menyunting
yang lama.

| Nomor | Keputusan | Status |
|---|---|---|
| [ADR-001](ADR-001-backend-monolitik-laravel.md) | Backend monolitik dengan Laravel | Diterima |
| [ADR-002](ADR-002-frontend-nextjs-terpisah.md) | Frontend Next.js terpisah, token di cookie httpOnly | Diterima |
| [ADR-003](ADR-003-tanpa-permanent-sidebar.md) | Navigasi atas mendatar, tanpa permanent sidebar | Diterima |
| [ADR-004](ADR-004-mysql-dengan-kolom-json.md) | MySQL, isi laporan sebagai JSON | Diterima |
| [ADR-005](ADR-005-sanctum-cookie-httponly.md) | Autentikasi Sanctum, token di cookie httpOnly | Diterima |
| [ADR-006](ADR-006-preview-first.md) | Export dan import selalu preview-first | Diterima |
| [ADR-007](ADR-007-deployment-docker-compose.md) | Deployment dengan Docker Compose | Diterima, **belum diverifikasi di server** |
| [ADR-008](ADR-008-larangan-fresh-migrate.md) | Larangan fresh migrate tanpa izin | Diterima |
| [ADR-009](ADR-009-penyimpanan-unggahan-di-luar-docker.md) | Berkas unggahan dan cadangan disimpan di luar Docker | Diterima |

## Cara menambah

Nomor berurut, tidak pernah dipakai ulang. Tiap berkas memuat:

* **Context** — keadaan yang membuat keputusan itu perlu, dengan angka bila ada.
* **Decision** — apa yang diputuskan, beserta konsekuensi teknis yang mengikat.
* **Alternatives** — yang dipertimbangkan dan alasan ditolaknya. Bagian ini yang
  paling sering dibutuhkan pembaca berikutnya; tanpanya, keputusan yang sudah
  ditimbang akan dibongkar ulang dari awal.
* **Consequences** — termasuk yang negatif. ADR yang hanya memuat keuntungan
  bukan catatan keputusan, melainkan pembelaan.

Keputusan yang berubah ditulis sebagai ADR baru yang menyatakan ADR lama
digantikan. Yang lama tetap ada — riwayat alasannya justru yang berguna.
