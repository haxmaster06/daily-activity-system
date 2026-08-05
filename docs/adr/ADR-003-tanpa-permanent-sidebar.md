# ADR-003 — Navigasi Atas Mendatar, Tanpa Permanent Sidebar

**Status:** Diterima
**Tanggal:** 5 Agustus 2026 (mencatat keputusan yang sudah dijalankan sejak awal project)

## Context

Layar utama DAMS adalah tabel pengisian laporan. Bentuk tabelnya berbeda tiap
departemen, dan sebagian template punya belasan kolom — Receiving Bahan Baku,
Proses Harian per LOT, Pemeriksaan Lot dengan Xray. Pengisinya membandingkan
nilai antar kolom sambil mengetik.

Sidebar permanen memakan 240–280 piksel di seluruh halaman, sepanjang waktu.
Pada layar 1366 piksel yang banyak dipakai di kantor, itu seperlima lebar yang
tersisa untuk tabel.

Jumlah menu utamanya sedikit: Dashboard, Laporan, Progres, Monitoring,
Analytics, Export, Pengaturan.

## Decision

Navigasi memakai **Horizontal Top Navigation Bar**. Permanent sidebar dilarang
di seluruh halaman.

Konsekuensi teknis yang mengikat:

1. Menu utama didefinisikan di satu tempat, `frontend/src/lib/nav.ts`, dan
   visibilitasnya ditentukan **izin**, bukan nama peran — peran dapat dibuat
   administrator dari layar sehingga daftarnya tidak tertutup.
2. Tiap halaman fitur memakai Breadcrumb yang dapat diklik sebagai penanda
   posisi, menggantikan peran orientasi yang biasanya dipegang sidebar.
3. Halaman tidak boleh menggulir mendatar. Tabel yang lebih lebar dari layar
   menggulir di dalam dirinya sendiri.

## Alternatives

**Sidebar yang dapat dilipat.** Ditolak. Keadaan terlipat harus diingat per
pengguna, dan pengisi laporan akan melipatnya selamanya — yang berarti
sidebarnya memang tidak dibutuhkan, hanya menambah satu keadaan untuk dijaga.

**Sidebar hanya pada halaman pengaturan.** Ditolak. Dua pola navigasi dalam satu
aplikasi membuat pengguna harus mempelajari keduanya, untuk menghemat satu klik.

## Consequences

Positif: seluruh lebar layar tersedia untuk tabel laporan. Satu pola navigasi
yang sama di semua halaman.

Negatif: menu bertingkat lebih sulit ditampung. Halaman Pengaturan karena itu
memakai satu pintu masuk dengan daftar di dalamnya, bukan menu tarik-turun
bertingkat. Bila jumlah menu utama kelak melewati sekitar tujuh, bar mendatar
akan mulai sesak dan keputusan ini perlu ditinjau ulang.

Ditulis ulang di `CLAUDE.md` dan `.agents/Standarization/standarization.md`
supaya terbaca sebelum halaman baru dibuat.
