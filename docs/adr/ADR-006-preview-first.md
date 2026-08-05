# ADR-006 — Export dan Import Selalu Preview-First

**Status:** Diterima
**Tanggal:** 5 Agustus 2026 (mencatat keputusan yang sudah dijalankan, diperluas ke import pada rilis ini)

## Context

Export laporan memakai penyaringan bertingkat: rentang tanggal, status,
departemen, penyusun, template. Unduhan langsung berarti pengguna baru mengetahui
hasil penyaringannya setelah membuka berkas — lalu mengulang, mengunduh lagi, dan
menumpuk berkas setengah benar di folder unduhan.

Import membawa masalah yang lebih tajam: berkas yang salah satu barisnya
bermasalah dapat menulis ratusan baris sebelum ketahuan, dan tidak ada tombol
batal setelahnya.

## Decision

Seluruh export dan import melewati langkah pratinjau. **Tidak ada unduhan
langsung, dan tidak ada penulisan sebelum isinya ditampilkan.**

Konsekuensi teknis yang mengikat:

1. Pratinjau dan berkas memakai **satu sumber data yang sama** —
   `App\Support\DataExport` untuk export. Isi berkas karena itu tidak pernah
   berbeda dari yang sudah dilihat.
2. Pratinjau dan penyimpanan import memakai **pemeriksaan yang sama persis** —
   `ImportMaster::periksa()` dan `ImportLaporan::periksa()`. Dua jalur terpisah
   yang menghitung sendiri pasti berbeda di suatu titik, dan begitu berbeda,
   langkah pratinjau berhenti berarti apa pun.
3. Jalur pratinjau **tidak menulis satu baris pun** ke basis data.
4. Penyimpanan berjalan di dalam satu transaksi.
5. Baris yang ditolak dilewati beserta alasannya, bukan menggagalkan seluruh
   berkas — pratinjau sudah menunjukkan baris mana saja itu.

## Alternatives

**Unduh langsung dengan ringkasan jumlah baris.** Ditolak. Jumlah baris tidak
menjawab pertanyaan yang sebenarnya: apakah kolomnya yang diharapkan, dan
apakah isinya terbaca benar.

**Import langsung dengan tombol batalkan.** Ditolak. Membatalkan berarti
menghapus data yang mungkin sudah disunting orang lain di antaranya, dan itu
menuntut riwayat versi yang tidak ada.

**Menimpa baris yang sudah ada saat import laporan.** Ditolak. Laporan yang
sudah dikirim dan ditinjau adalah arsip; menimpanya lewat berkas berarti
menghapus catatan tanpa jejak. Tanggal yang sudah punya laporan **ditolak**.

## Consequences

Positif: pengguna melihat hasilnya sebelum berkomitmen. Baris bermasalah
disebutkan beserta alasannya, satu per satu, sebelum apa pun tersimpan.

Negatif: satu langkah tambahan pada tiap export dan import. Berkas import
dikirim dua kali — sekali untuk diperiksa, sekali untuk disimpan — karena
menyimpannya sementara di server berarti mengurus pembersihan berkas sisa.
Penguraiannya karena itu dikerjakan dua kali; itu diterima, dan itulah sebab
jalur import tidak memakai queue: biaya penguraian sudah dibayar di muka oleh
pratinjau yang memang harus sinkron.

Ditulis ulang sebagai larangan di `docs/standar-ui-ux.md` §9.
