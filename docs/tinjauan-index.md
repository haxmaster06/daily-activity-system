# Tinjauan Index dan EXPLAIN

Dikerjakan 5 Agustus 2026, memakai `EXPLAIN` sungguhan pada `dams_db`, bukan
pembacaan skema.

Jumlah baris pada database pengembangan masih kecil, sehingga kolom `rows`
tidak berarti apa-apa. Yang dibaca adalah **`type` dan `key`** — apakah MySQL
menemukan jalan masuk lewat index, atau membaca seluruh tabel.

## Yang diperiksa

Sepuluh query terberat: daftar laporan, laporan milik sendiri per tanggal,
kelima angka Executive Analytics, papan progres, monitoring "belum melapor",
isi daftar master, dan notifikasi.

## Dua temuan, keduanya diperbaiki

### 1. `whereDate()` mematikan index

`whereDate('report_date', ...)` membungkus kolom dengan `DATE()`. Karena
`report_date` **memang sudah bertipe DATE**, pembungkusan itu tidak mengubah
hasil — tetapi membuat MySQL tidak dapat memakai kolomnya untuk mempersempit
pencarian.

Terukur pada `daily_reports_department_id_report_date_index`:

| Bentuk query | type |
|---|---|
| `DATE(report_date) >= ?` | `ref` — hanya `department_id` yang dipakai |
| `report_date >= ?` | `range` — kedua kolom dipakai |

Diperbaiki di `DailyReport::scopeDalamRentang()`, `DashboardController` (tiga
tempat), `DailyReportController`, `PengingatController`, dan
`AnalitikController`.

**Pengecualian yang disengaja:** `notifications.created_at` bertipe TIMESTAMP,
bukan DATE. Di sana perbandingan satu nilai memang tidak benar, sehingga
ditulis sebagai `whereBetween` antara awal dan akhir hari — tetap dapat memakai
index, dan tetap benar.

### 2. `tugas.target_selesai` tanpa index

Executive Analytics menjalankan ini pada tiap pemuatan halaman:

```sql
WHERE target_selesai < ? AND status <> 'selesai' ORDER BY target_selesai
```

Sebelum perbaikan: `type=ALL`, seluruh tabel dibaca, lalu diurutkan dengan
filesort.

Ditambahkan `tugas_target_selesai_status_index` lewat migration additive
(`2026_08_05_120000`). Sesudahnya: `type=range`, memakai index, tanpa filesort.

Urutan kolomnya `target_selesai` lebih dulu karena kolom itu yang disaring
sebagai rentang **sekaligus** dipakai mengurutkan — index yang sama menutup
keduanya.

## Yang diperiksa dan ternyata tidak bermasalah

* **`notifications`** — sempat terlihat tanpa index, ternyata query ujinya yang
  salah: kolom `notifiable_type` tidak disertakan, padahal index gabungannya
  dimulai dari kolom itu. Dengan query yang sebenarnya dipakai aplikasi,
  indexnya terpakai.
* **`daily_report_items.progress_status`** — sudah didenormalisasi dan
  diindeks; Analytics memakainya lewat `Using index`.
* **`master_data`** — `master_type_id, is_active, sort_order` sudah menutup
  daftar berpagination.
* **Monitoring "belum melapor"** — memakai `users_department_id_is_active_index`
  dan `daily_reports_user_id_report_date_unique`, keduanya `Using index`.

## Filesort yang dibiarkan

Dua tempat masih memakai filesort, dan itu diterima:

* Daftar laporan `ORDER BY report_date DESC, id DESC` dengan
  `department_id IN (...)`. Beberapa rentang index sekaligus memang menuntut
  pengurutan ulang; menambah `id` ke index tidak menghilangkannya.
* Papan progres `ORDER BY urutan, id DESC`. Jumlah kartu per papan kecil, dan
  papannya memang tidak berpagination.

## Cara mengulangi tinjauan ini

Jalankan `EXPLAIN` pada query yang sama setelah data tumbuh, terutama sesudah
setahun pemakaian. Yang perlu dicurigai: `type=ALL` pada tabel yang sudah besar,
dan `key` kosong pada query yang berjalan di tiap pemuatan halaman.
