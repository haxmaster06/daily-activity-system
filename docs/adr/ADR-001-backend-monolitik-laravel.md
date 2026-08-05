# ADR-001 — Backend Monolitik dengan Laravel

**Status:** Diterima
**Tanggal:** 5 Agustus 2026 (mencatat keputusan yang sudah dijalankan sejak awal project)

## Context

DAMS menggantikan Daily Report berbasis Excel dan Word di CV Hasil Barokah
Mandiri. Pemakainya seluruh karyawan di sekitar dua puluh departemen, dengan
puncak pemakaian pada jam pelaporan sore. Bukan beban yang menuntut pemecahan
layanan.

Yang justru berat adalah bentuk datanya: tiap departemen punya kolom laporan
yang berbeda, dan bentuk itu diatur administrator dari layar, bukan dari kode.
Satu perubahan template menyentuh validasi, penyimpanan, export, import, dan
Analytics sekaligus.

Tim pengembangnya satu orang. Tidak ada tim operasi tersendiri.

## Decision

Backend berupa satu aplikasi Laravel 12 yang menyajikan REST API, bukan
beberapa layanan terpisah.

Konsekuensi teknis yang mengikat:

1. Aturan pengisian template tinggal di satu tempat, `App\Support\ValidasiIsianTemplate`,
   dan dipakai bersama oleh pengisian layar maupun import berkas.
2. Aturan jangkauan data tinggal di `scopeVisibleTo()` pada modelnya —
   `DailyReport` dan `Tugas` — bukan disusun ulang di tiap controller.
3. Pekerjaan panjang dijalankan lewat queue Laravel pada proses terpisah, bukan
   lewat layanan tersendiri.

## Alternatives

**Memecah menjadi beberapa layanan.** Ditolak. Bentuk laporan yang dinamis
membuat batas layanan sulit ditarik: layanan mana pun yang menyimpan laporan
harus tahu definisi templatenya. Yang didapat hanyalah panggilan jaringan di
tempat yang sebelumnya berupa pemanggilan fungsi, ditambah kebutuhan menjaga
konsistensi antar penyimpanan.

**Backend-as-a-service.** Ditolak. Aturan jangkauan data DAMS bertingkat —
pribadi, departemen, korporat, dengan penetapan peran yang menumpuk — dan
menegakkannya di luar kode aplikasi membuatnya tersebar di dua tempat.

## Consequences

Positif: satu basis kode, satu penyebaran, satu transaksi basis data. Aturan
yang berlaku lintas fitur dapat ditulis sekali dan dipakai bersama; itulah yang
membuat import berkas tidak dapat memasukkan nilai yang ditolak layar.

Negatif: seluruh aplikasi diskalakan sebagai satu kesatuan. Bila kelak satu
bagian — misalnya export berkas besar — menuntut sumber daya yang jauh berbeda,
pemisahannya harus dikerjakan belakangan.

Yang akan membatalkan keputusan ini: jumlah pemakai bersamaan naik jauh melewati
satu perusahaan, atau muncul kebutuhan menyajikan data DAMS ke sistem lain
dengan siklus rilis yang berbeda.
