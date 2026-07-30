# Skema Kolom Template Laporan per Departemen

Sumber kebenaran kolom untuk `report_templates` dan `template_fields`.

Disalin dari berkas acuan klien (`Requirement1.docx`, `QA1.docx`, `QA2.docx`,
serta header sheet pada workbook Document Control, MTN, Finance, dan ORGANIC).

**Berkas asli tidak ada di repository** — memuat data yang dapat
mengidentifikasi orang dan rahasia dagang. Dokumen ini sengaja hanya memuat
**nama kolom dan tipe data**; tidak ada nama karyawan, nama supplier, nomor
LOT, angka produksi, maupun nomor PO. Jangan menambahkan nilai contoh yang
berasal dari data asli ke dalam berkas ini.

Tipe pada kolom `template_fields.type`: `text`, `textarea`, `integer`,
`decimal`, `date`, `month`, `select`, `boolean`.

---

## Template umum — berlaku semua departemen

**`AKTIVITAS_UMUM`** (`department_id` = NULL)

| Kolom | Tipe | Wajib |
|---|---|---|
| Aktivitas | textarea | ya |
| Keterangan | textarea | tidak |
| Target Penyelesaian | text | tidak |
| Status | select (`belum_mulai`, `dalam_proses`, `selesai`) | ya |

Dipakai apa adanya oleh: Finance & Accounting, Admin Keuangan, ICS / Organic,
Maintenance, GA Legal — bentuk berkas mereka memang hanya empat kolom ini.

---

## Produksi

### `PROD_SPK` — SPK & Pemenuhan Order

| Kolom | Tipe | Grup |
|---|---|---|
| No SPK | text | |
| PO# | text | |
| Nama Perusahaan | text | |
| Kode Item | text | |
| Deskripsi | textarea | |
| Pouch | integer | QTY Dibutuhkan |
| Box | integer | QTY Dibutuhkan |
| Pouch | integer | QTY Selesai |
| Box | integer | QTY Selesai |
| Pouch | integer | Kekurangan |
| Box | integer | Kekurangan |
| Tanggal Mulai Produksi | date | |
| Tanggal Selesai Produksi | date | |
| Tanggal Pengiriman | date | |
| Keterangan | textarea | |

Kolom Kekurangan dapat dihitung (`dibutuhkan − selesai`), tetapi tetap
disimpan agar nilai yang pernah dicatat operator tidak berubah saat rumusnya
disesuaikan.

### `PROD_PROSES` — Proses Harian per LOT

| Kolom | Tipe | Grup |
|---|---|---|
| Tanggal Produksi | date | |
| LOT# | integer | |
| Target Per Hari (kg) | decimal | Oven |
| QTY Masuk (kg) | decimal | Oven |
| QTY Keluar (kg) | decimal | Oven |
| Waste (kg) | decimal | Oven |
| Target Per Hari (kg) | decimal | Ayak |
| QTY Masuk (kg) | decimal | Ayak |
| QTY Ayak (kg) | decimal | Ayak |
| QTY Keluar (kg) | decimal | Ayak |
| QTY Brontol (kg) | decimal | Ayak |
| Sisa WIP (kg) | decimal | Ayak |
| Target Per Hari (kg) | decimal | Packing 1 |
| QTY Masuk (kg) | decimal | Packing 1 |
| QTY Keluar (Pouch 300gr) | integer | Packing 1 |
| Sisa WIP (kg) | decimal | Packing 1 |
| Target Per Hari (kg) | decimal | Xray |
| QTY Masuk (Pouch 300gr) | integer | Xray |
| QTY Keluar (Pouch 300gr) | integer | Xray |
| Reject Xray (Pouch 300gr) | integer | Xray |
| Sisa Reject (Pouch 300gr) | integer | Xray |
| Sisa Belum Packing (Pouch) | integer | Xray |
| Target Per Hari (Pouch) | integer | Packing 2 |
| QTY Masuk (Pouch 300gr) | integer | Packing 2 |
| QTY Keluar (Box 25kg) | integer | Packing 2 |
| Target Tercapai (%) | integer | Packing 2 |
| Keterangan | textarea | |

`group_label` dirender sebagai header tabel dua baris, mengikuti bentuk
lembar kerja aslinya.

---

## QC

Terdapat dua varian lembar QC pada berkas acuan. Perbedaannya ada pada kolom
pemeriksaan lot; keduanya disediakan sebagai template terpisah agar tiap tim
memakai yang sesuai.

### `QC_LOT` — Pemeriksaan Lot (varian 1)

| Kolom | Tipe |
|---|---|
| Lot Product | integer |
| QTY Masuk (kg) | decimal |
| QTY Halus (kg) | decimal |
| Brontol (kg) | decimal |
| Lost (kg) | decimal |
| Waste (kg) | decimal |
| Sortir (kg) | decimal |
| Benda Asing | text |
| Kadar Air Produk (maks. 2%) | decimal |
| QTY Packing (kg) | decimal |
| QTY Packing (box) | integer |
| Keterangan | textarea |

### `QC_LOT_XRAY` — Pemeriksaan Lot (varian 2)

| Kolom | Tipe |
|---|---|
| Lot Product | integer |
| QTY Masuk (kg) | decimal |
| QTY Halus (kg) | decimal |
| Brontol (kg) | decimal |
| Xray Detected (kg) | decimal |
| Benda Asing | text |
| Sortir | decimal |
| Kadar Air Produk (maks. 2%) | decimal |
| Suhu Ruangan | decimal |
| Kelembapan Ruangan | decimal |
| QTY Packing (kg) | decimal |
| Keterangan | textarea |

### `QC_OVEN` — Input/Output Oven

| Kolom | Tipe |
|---|---|
| Lot Product | integer |
| QTY Input Oven (kg) | decimal |
| QTY Output Oven (kg) | decimal |
| Waste (kg) | decimal |
| Kadar Air Produk (%) | decimal |

### `QC_KONTROL_PROSES` — Kontrol Proses

| Kolom | Tipe |
|---|---|
| Supplier | text |
| LOT | integer |
| Temuan | textarea |
| Keterangan | textarea |

### `QC_PENGUJIAN_BB` — Pengujian Bahan Baku

| Kolom | Tipe |
|---|---|
| Supplier | text |
| LOT | integer |
| Gluten | decimal |
| Sulvit | decimal |
| Refinasi | decimal |
| Keterangan | textarea |

Nilai nol pada Gluten, Sulvit, dan Refinasi ditampilkan sebagai `nd`
(*not detected*), bukan angka 0. Aturan ini diterapkan di lapisan tampilan;
yang disimpan tetap angka.

---

## QA

### `QA_RECEIVING` — Receiving Bahan Baku

| Kolom | Tipe |
|---|---|
| Supplier | text |
| LOT | text |
| Total Diterima (kg) | decimal |
| Jumlah Direject (kg) | decimal |
| Keterangan | textarea |

Salah satu varian lembar memakai kolom `Temuan` (textarea) menggantikan
`Total Diterima` dan `Jumlah Direject`.

### `QA_PENGUJIAN` — Pengujian Bahan Baku

| Kolom | Tipe |
|---|---|
| Supplier | text |
| LOT | text |
| Qty (kg) | decimal |
| Sulfit | text |
| Gluten | text |
| Rafinasi | text |

Kolom pengujian bertipe teks karena isinya dapat berupa angka, `nd`, atau
keterangan seperti "tidak diujikan".

QA juga memakai `AKTIVITAS_UMUM` untuk kegiatan dokumen dan compliance.

---

## Document Control

### `DC_DOKUMEN` — Aktivitas Harian Document Control

| Kolom | Tipe |
|---|---|
| Aktivitas | textarea |
| Jenis Document | textarea |
| Nomor Document | text |
| Revisi Ke- | text |
| Status Document | text |
| Klausul | text |
| Referensi | text |
| Keterangan | textarea |
| Target Penyelesaian | text |

---

## Warehouse

### `WH_RAW` — Raw Material

| Kolom | Tipe |
|---|---|
| LOT# | text |
| Supplier Name | text |
| QTY | decimal |
| UoM | select (`kg`, `pcs`) |

### `WH_PACKAGING` — Packaging Material

| Kolom | Tipe |
|---|---|
| Supplier Name | text |
| Deskripsi Barang | text |
| QTY | decimal |
| UoM | select (`kg`, `pcs`) |

### `WH_FINISH_GOOD` — Finish Good

| Kolom | Tipe |
|---|---|
| Produk | text |
| QTY | decimal |
| UoM | select (`kg`, `pcs`) |

### `WH_RECEIVING` — Receiving

| Kolom | Tipe |
|---|---|
| Supplier Name | text |
| QTY | decimal |
| UoM | select (`kg`, `pcs`) |

### `WH_SHIPPING` — Shipping

| Kolom | Tipe |
|---|---|
| Customer Name | text |
| Product | text |
| QTY | decimal |
| UoM | select (`kg`, `pcs`) |

Warehouse juga memakai `AKTIVITAS_UMUM`.

---

## Purchasing

### `PO_SUPPLIER` — Purchase Order

| Kolom | Tipe |
|---|---|
| Supplier | text |
| Kode PO | text |
| QTY PO (kg) | decimal |
| ETD | date |
| ETA | date |
| Keterangan | textarea |

Purchasing juga memakai `AKTIVITAS_UMUM`.

---

## EX/IM

### `EXIM_SHIPMENT` — Rencana Pengiriman

| Kolom | Tipe |
|---|---|
| Company Name | text |
| Kapasitas Kirim (kg) | decimal |
| ETD | date |
| Keterangan | textarea |

EX/IM juga memakai `AKTIVITAS_UMUM`.

---

## HRD

### `HRD_TRAINING` — Training & MCU

| Kolom | Tipe |
|---|---|
| Training / MCU | text |
| Bulan | month |
| Estimasi Pelaksanaan | text |
| Program | text |
| Update | text |
| Target Penyelesaian | month |
| Keterangan | textarea |

HRD juga memakai `AKTIVITAS_UMUM`.

---

## Retail MND

### `RETAIL_KIRIM` — Pengiriman Retail

| Kolom | Tipe |
|---|---|
| Nama Barang | text |
| QTY | decimal |
| Satuan | select (`kg`, `pcs`) |
| Jumlah Karton | integer |
| Customer | text |
| Tanggal Kirim | date |
| Tujuan | text |
| Keterangan | textarea |

---

## Catatan penerapan

1. **Nomor urut baris tidak disimpan.** Kolom "No" pada lembar asli hanya
   penomoran tampilan; urutan diambil dari `daily_report_items.sort_order`.
2. **Satuan dipisah dari angka.** Lembar asli menulis "QTY (kg)/(pcs)" dalam
   satu kolom. Di sistem, angka masuk kolom bertipe `decimal` dan satuannya
   jadi kolom `select` tersendiri agar dapat direkap.
3. **`Target Penyelesaian` bertipe teks, bukan tanggal.** Lembar asli mengisi
   kolom ini dengan tanggal, tanda hubung, maupun kalimat bebas. Memaksanya
   menjadi tanggal akan menolak data yang selama ini sah.
4. **Satu departemen boleh punya beberapa template.** Pengguna memilih template
   mana yang dipakai pada laporan hari itu; satu laporan dapat memuat beberapa
   bagian sekaligus (`daily_report_sections`).
5. Template baru dibuat administrator lewat antarmuka — **tanpa migration,
   tanpa fresh migrate** (lihat `docs/adr/ADR-008-larangan-fresh-migrate.md`).
