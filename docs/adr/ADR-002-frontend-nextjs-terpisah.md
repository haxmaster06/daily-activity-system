# ADR-002 — Frontend Next.js Terpisah dari Backend

**Status:** Diterima
**Tanggal:** 5 Agustus 2026 (mencatat keputusan yang sudah dijalankan sejak awal project)

## Context

DAMS dipakai di layar kantor maupun di area produksi. Layar pengisian laporan
memuat tabel bergulir dengan kolom yang berbeda tiap departemen, papan progres
tarik-lepas, dan grafik ringkasan — semuanya menuntut keadaan di sisi peramban
yang tidak nyaman ditulis sebagai Blade beserta JavaScript tempelan.

Sementara itu token akses tidak boleh dapat dibaca JavaScript: perangkat di area
produksi dipakai bergantian, dan sesi tidak lagi berakhir sendiri
(`config/dams.php`, catatan Sesi Pengguna).

## Decision

Frontend berupa aplikasi Next.js 15 tersendiri dengan App Router, memanggil REST
API Laravel.

Konsekuensi teknis yang mengikat:

1. **Peramban tidak pernah memanggil backend secara langsung.** Token disimpan
   pada cookie `httpOnly`; seluruh panggilan melewati Server Component, Server
   Action, atau Route Handler Next.js (`src/lib/api.ts`).
2. Mutasi dikerjakan lewat Server Action, bukan `fetch` dari peramban. Itu yang
   membuat tidak perlu ada endpoint proxy tersendiri untuk tiap tindakan.
3. Unduhan berkas dialirkan lewat Route Handler yang meneruskan respons apa
   adanya — berkas tidak pernah singgah di penyimpanan server Next.

## Alternatives

**Blade dengan Livewire atau Inertia.** Ditolak. Papan tarik-lepas, tabel
dengan kolom beku, dan penyunting template membutuhkan model keadaan di sisi
peramban yang penuh; menyusunnya di atas render server berarti melawan
kerangkanya sepanjang waktu.

**SPA murni tanpa server frontend.** Ditolak. Tanpa lapisan server, token harus
tinggal di tempat yang terbaca JavaScript, dan itu tidak dapat diterima pada
perangkat yang dipakai bergantian.

## Consequences

Positif: token tidak pernah tersentuh JavaScript peramban. Halaman dirender di
server sehingga muatan awalnya ringan, dan komponen interaktif tetap leluasa.

Negatif: dua proses yang harus dijalankan dan diawasi, dua rangkaian dependensi,
dan dua tempat yang harus disepakati bentuk datanya. Sebagian tipe data ditulis
dua kali — sekali sebagai Resource PHP, sekali sebagai `interface` TypeScript —
dan keduanya dapat menyimpang tanpa ada yang memberi tahu.

Yang akan membatalkan keputusan ini: bila kelak muncul kebutuhan berjalan tanpa
proses Node sama sekali, misalnya pemasangan di server pelanggan yang hanya
menyediakan PHP.
