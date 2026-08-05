# ADR-004 — MySQL, dengan Isi Laporan sebagai JSON

**Status:** Diterima
**Tanggal:** 5 Agustus 2026 (mencatat keputusan yang sudah dijalankan sejak awal project)

## Context

Bentuk kolom laporan berbeda tiap departemen dan diatur administrator dari layar
— tanpa migration. Menyimpannya sebagai kolom sungguhan berarti satu tabel per
template dan migration setiap kali template berubah, dan itu justru yang hendak
dihilangkan dari cara kerja lama berbasis Excel.

Perusahaan sudah menjalankan MySQL untuk beberapa project lain di server yang
sama, beserta orang yang mengurusnya.

## Decision

Basis data MySQL 8. Isi tiap baris laporan disimpan pada kolom JSON
`daily_report_items.data`, dengan definisi kolomnya di `template_fields`.

Konsekuensi teknis yang mengikat:

1. **Nilai yang perlu disaring atau dihitung tidak boleh hanya hidup di dalam
   JSON.** `progress_status` didenormalisasi menjadi kolom tersendiri dan
   diindeks, karena Monitoring dan Executive Analytics menyaringnya —
   penyaringan di dalam JSON tidak dapat memakai index.
2. **Nilai dari daftar master disimpan sebagai salinan `{kode, nama}`, bukan
   kunci asing.** Laporan adalah arsip; menghapus atau mengubah satu baris
   master tidak boleh mengubah isi laporan tahun lalu. Pola yang sama dipakai
   `daily_reports.department_id` yang disalin saat laporan dibuat, dan
   `audit_logs.user_name`.
3. Aturan yang tidak dapat ditegakkan basis data ditegakkan Form Request.
   `CHECK constraint` **tidak dipakai**: MySQL di bawah 8.0.16 mengabaikannya
   diam-diam, sehingga aturan yang ditulis di sana hanya terlihat dijaga.

## Alternatives

**PostgreSQL dengan `jsonb`.** Lebih kuat untuk isi JSON: index GIN membuat
penyaringan di dalam dokumen benar-benar mungkin. Ditolak karena perusahaan
tidak menjalankan PostgreSQL, sehingga pemeliharaannya menjadi tanggungan baru
untuk keuntungan yang sudah tertutup oleh denormalisasi kolom yang disaring.

**Satu tabel per template.** Ditolak. Administrator mengubah template dari
layar; itu berarti perubahan skema saat aplikasi berjalan.

**Entity-Attribute-Value.** Ditolak. Satu baris laporan dengan lima belas kolom
menjadi lima belas baris; membaca satu laporan berubah menjadi penggabungan yang
mahal, dan urutan kolomnya hilang.

## Consequences

Positif: template baru tidak menuntut migration. Satu baris laporan terbaca
sebagai satu baris.

Negatif: isi JSON tidak dapat disaring dengan index. Tiap nilai yang kelak perlu
disaring harus dinaikkan menjadi kolom tersendiri lewat migration additive —
persis yang sudah dilakukan `progress_status`. Basis data juga tidak dapat
menjamin bentuk isi JSON; penjaminnya `ValidasiIsianTemplate`, dan itulah sebab
seluruh jalur penulisan — layar maupun import — wajib melewatinya.
