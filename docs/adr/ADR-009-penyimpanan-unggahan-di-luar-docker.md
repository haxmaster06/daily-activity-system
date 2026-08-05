# ADR-009 — Berkas unggahan disimpan di luar Docker

**Status:** Diterima
**Tanggal:** 6 Agustus 2026

## Konteks

DAMS menyimpan empat jenis berkas yang tidak dapat dibuat ulang dari mana pun:

1. **Lampiran laporan harian** — foto kondisi barang, surat jalan yang dipindai
2. **Foto profil** — diunggah tiap karyawan sendiri
3. **Berkas export** — Excel dan PDF yang sudah dibagikan tautannya
4. **Cadangan basis data** — ditulis `dams:backup` lewat scheduler

Susunan semula memakai named volume Docker (`backend_storage`) yang dibagi
container `backend` dan `queue`.

Server tujuan dipakai bersama beberapa project lain, dan sudah punya direktori
pencadangan yang disalin rutin: `/mnt/raw-backup`.

## Keputusan

Keempatnya disimpan pada host, di bawah satu jalur yang diatur
`DAMS_STORAGE_PATH`, dengan bawaan:

```
/mnt/raw-backup/app_data_storage/hbm-daily-activity/
├── storage-app/   → /var/www/html/storage/app
└── backup/        → /var/backup/dams
```

Dipasang sebagai **bind mount** pada container `backend` dan `queue`.

## Alasan

**Named volume tidak ikut tercadangkan.** Isinya berada di
`/var/lib/docker/volumes`, di luar `/mnt/raw-backup` yang disalin rutin. Cadangan
server yang berjalan setiap hari tidak pernah menyentuhnya, dan tidak ada yang
menyadarinya sampai berkasnya dibutuhkan.

**Named volume dapat lenyap tanpa disengaja.** `docker volume prune` adalah
perintah yang dijalankan orang saat membersihkan server yang penuh. Pada server
yang dipakai bersama, yang menjalankannya belum tentu tahu volume itu milik
siapa.

**Bind mount, bukan symbolic link.** Symlink yang dibuat di dalam container tetap
menunjuk ke jalur di dalam container — sasarannya baru ada bila jalur itu sendiri
sudah di-mount. Bind mount sudah menjadi keduanya sekaligus, dalam satu baris,
tanpa lapisan tambahan yang perlu diperiksa saat ada yang salah.

**Cadangan basis data ikut, dan itu disengaja.** Cadangan yang tersimpan di
dalam server yang sama dengan basis datanya hanya melindungi dari kesalahan
manusia, bukan dari kegagalan mesin. Menaruhnya di `/mnt/raw-backup` membuatnya
ikut terbawa keluar oleh pencadangan yang sudah berjalan.

## Konsekuensi

**Direktorinya wajib disiapkan sebelum `docker compose up`,** lengkap dengan
kepemilikan uid 82 (`www-data` pada image Alpine yang dipakai). Langkahnya ada
di `docs/panduan-deployment.md` §3b.

**Kegagalan yang paling berbahaya di sini tidak terlihat.** Bila `chown`
terlewat, container gagal menulis dan galatnya jelas. Tetapi bila
`DAMS_STORAGE_PATH` salah tulis, Docker membuat direktori baru yang kosong,
aplikasinya berjalan normal, dan berkasnya tersimpan di tempat yang tidak pernah
dicadangkan. Karena itu panduan deployment menuntut pemeriksaan bahwa berkas uji
benar-benar mendarat di jalur host — bukan sekadar bahwa unggahannya berhasil.

**Memindahkan server berarti memindahkan direktori itu juga.** Basis data saja
tidak cukup: laporan akan tetap menyebut lampiran yang berkasnya tidak ada.

## Alternatif yang ditolak

**Object storage (S3/MinIO).** Menambah satu layanan yang harus dijaga hidup,
dicadangkan, dan diamankan sendiri — untuk volume berkas yang seluruhnya masih
terhitung gigabita. Dapat ditinjau ulang bila arsipnya tumbuh melewati kapasitas
disk server.

**Menyimpan berkas di basis data sebagai blob.** Tiap dump membengkak berkali
lipat, dan cadangan harian yang dijadwalkan ikut membesar tanpa alasan.
