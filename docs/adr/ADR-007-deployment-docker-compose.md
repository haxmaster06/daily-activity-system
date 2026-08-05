# ADR-007 — Deployment dengan Docker Compose

**Status:** Diterima, **belum diverifikasi di server**
**Tanggal:** 5 Agustus 2026

## Context

DAMS terdiri dari beberapa proses yang harus hidup bersamaan: API Laravel,
frontend Next.js, worker queue, penjadwal, dan server WebSocket Reverb. Di mesin
pengembangan kelimanya dijalankan `JALANKAN_DAMS.bat`.

Sasarannya satu server internal, `10.10.10.201`. Tidak ada tim operasi
tersendiri, dan tidak ada klaster.

Server itu sudah menjalankan hal lain. Kondisinya — versi OS, versi Docker, port
yang bebas, RAM dan inti, apakah sudah ada MySQL yang dipakai bersama — **belum
diperiksa saat dokumen ini ditulis**.

## Decision

Penyebaran memakai Docker Compose, satu berkas `docker-compose.yml` untuk
seluruh layanan.

Konsekuensi teknis yang mengikat:

1. Reverb berjalan sebagai container tersendiri, bukan proses tambahan di dalam
   container backend. Sambungan WebSocket berumur panjang, sedangkan container
   backend dimatikan dan dinyalakan ulang tiap rilis.
2. Worker queue dan penjadwal juga container tersendiri. Penjadwal yang mati
   diam-diam berarti backup harian berhenti tanpa ada yang tahu (ADR-008).
3. Seluruh port DAMS berada di rentang 13000-an supaya tidak bertabrakan dengan
   layanan lain di server yang sama: 13001, 13002, 13003, 13080, 13443, 13306,
   13379.
4. **Port 3306 tidak pernah disentuh.** Server MySQL yang ada dipakai bersama
   project lain.

## Alternatives

**Kubernetes.** Ditolak. Satu server, satu aplikasi, tanpa tim operasi. Yang
didapat hanyalah lapisan yang harus dipelajari dan dijaga.

**Pemasangan langsung tanpa container.** Ditolak. Versi PHP, ekstensi, dan Node
harus cocok dengan lingkungan pengembangan; menyamakannya di server yang sudah
menjalankan hal lain adalah sumber selisih yang paling sering.

**Layanan terkelola di luar.** Ditolak. Data laporan memuat angka produksi dan
nama karyawan; pemilik project menghendakinya tetap di dalam jaringan
perusahaan.

## Consequences

Positif: lingkungan yang sama dapat dijalankan ulang. Menambah worker cukup
menaikkan jumlah replikanya.

Negatif: satu server berarti satu titik kegagalan. Backup dan uji restore
(ADR-008, `dams:backup` dan `dams:uji-restore`) karena itu bukan pelengkap
melainkan bagian dari rencana pemulihan — dan hasilnya wajib disalin ke luar
server, sebab backup yang tersimpan di server yang sama ikut hilang bersama
servernya.

## Yang masih terbuka

Keputusan ini **belum diverifikasi**. Yang harus diperiksa sebelum rilis
pertama, dan dapat mengubah isi `docker-compose.yml`:

* Versi OS dan versi Docker Compose di 10.10.10.201.
* Port 13001–13003, 13080, 13443, 13306, 13379 benar-benar bebas.
* Jumlah inti dan RAM — menentukan jumlah worker, dan apakah MySQL layak
  seruangan dengan yang lain.
* Apakah server sudah punya MySQL yang dipakai bersama. Bila ya, layanan `db`
  dibuang dan `DB_HOST` diarahkan ke sana; dua MySQL di satu mesin tanpa alasan
  hanya menghabiskan memori.
* Apakah sudah ada reverse proxy di depan untuk `daily.hbmnet.co.id`. Bila ya,
  layanan `proxy` tidak dipakai.

Langkah pemeriksaannya ada di `docs/panduan-deployment.md` §1.
