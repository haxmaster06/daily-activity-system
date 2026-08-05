# API DAMS

70 endpoint, seluruhnya di bawah `/api`. Dokumen ini disusun dari
`php artisan route:list`, bukan dari ingatan — bila keduanya berbeda, rutenya
yang benar.

Alamat pengembangan: `http://127.0.0.1:13002`.

---

## 1. Bentuk balasan

**Setiap** endpoint membalas dengan envelope yang sama, termasuk saat gagal:

```json
{ "success": true, "message": "", "data": {} }
```

Galat menambahkan dua kunci:

```json
{
  "success": false,
  "message": "Periksa kembali isian Anda.",
  "data": null,
  "errors": { "title": ["Judul wajib diisi."] },
  "reference": "ERR-20260805-001"
}
```

`message` **selalu Bahasa Indonesia dan siap ditampilkan** ke pengguna. Detail
teknis tidak pernah masuk ke sini; yang masuk hanya ke log, ditandai
`reference` yang sama.

Daftar berpagination menambahkan `meta`:

```json
{ "meta": { "halaman_saat_ini": 1, "per_halaman": 25, "total_data": 130, "total_halaman": 6 } }
```

### Kode status yang dipakai

| Kode | Arti | Pesan yang diterima pengguna |
|---|---|---|
| 200 | Berhasil | sesuai tindakannya |
| 201 | Data dibuat | sesuai tindakannya |
| 401 | Belum masuk atau token dicabut | "Sesi Anda telah berakhir. Silakan masuk kembali." |
| 403 | Izin kurang, atau data di luar jangkauan | "Anda tidak memiliki akses ke data ini." |
| 404 | Tidak ditemukan, **atau di luar jangkauan** | "Data yang Anda cari tidak ditemukan." |
| 422 | Isian tidak sah | "Periksa kembali isian Anda." + `errors` |
| 429 | Terlalu sering | "Terlalu banyak percobaan. Coba lagi beberapa saat lagi." |
| 500 | Gangguan tak terduga | pesan umum + `reference` |

> **404 pada data yang ada.** Route model binding menyaring lewat jangkauan
> data, sehingga data milik departemen lain terbaca sebagai tidak ada. Itu
> disengaja: membedakan "tidak ada" dari "tidak boleh" sudah membocorkan
> keberadaannya.

---

## 2. Autentikasi

Sanctum personal access token. **Peramban tidak memanggil API ini langsung** —
seluruh panggilan melewati sisi server Next.js yang menyimpan tokennya pada
cookie `httpOnly` (ADR-002, ADR-005).

```http
POST /api/login          ← satu-satunya endpoint tanpa autentikasi selain /health
Content-Type: application/json

{ "email": "nama@hbmcorp.co.id", "password": "..." }
```

Balasannya memuat `data.token`. Sertakan pada permintaan berikutnya:

```http
Authorization: Bearer <token>
Accept: application/json
```

`POST /api/logout` mencabut token yang sedang dipakai. Menonaktifkan akun atau
mengatur ulang kata sandinya membuang **seluruh** token pengguna tersebut.

Token tidak kedaluwarsa sendiri — lihat ADR-005 beserta konsekuensinya.

---

## 3. Dua lapis penjagaan, keduanya wajib

| Lapis | Menentukan | Ditegakkan |
|---|---|---|
| Izin | **apakah** boleh menyentuh modul | middleware `izin:` dan Policy |
| Jangkauan data | **data mana** yang terlihat | `scopeVisibleTo()` pada modelnya |

Izin tanpa jangkauan membuka seluruh perusahaan. Jangkauan tanpa izin membuka
modul yang seharusnya tertutup. Endpoint baru wajib punya keduanya — deny by
default.

Jangkauan bertingkat: Pribadi (1), Departemen (2), Korporat (3). Tingkat
tertinggi dari seluruh penetapan peran yang dipegang seseorang yang berlaku, dan
penetapan tingkat Departemen menumpuk menjadi himpunan departemen.

### Endpoint yang menuntut izin tersendiri

| Endpoint | Izin |
|---|---|
| `GET /api/dashboard` | `dashboard.lihat` |
| `GET /api/monitoring` | `monitoring.lihat` |
| `POST /api/monitoring/pengingat` | `monitoring.kirim-pengingat` |
| `GET /api/analitik` | `analitik.lihat` |
| `GET /api/export/pratinjau`, `/excel`, `/pdf` | `export.laporan` |

Sisanya dijaga Policy pada tiap aksi — daftar izin lengkapnya di
`App\Support\KatalogIzin`.

### Batas laju

| Endpoint | Batas |
|---|---|
| `POST /api/login` | `login` |
| `POST /api/monitoring/pengingat` | `pengingat` |
| Seluruh unggahan berkas dan import | `unggah` |
| Sisanya | `api` |

---

## 4. Daftar endpoint

### Sesi dan profil

| Metode | Alamat | Keterangan |
|---|---|---|
| POST | `/login` | Tanpa autentikasi |
| POST | `/logout` | Mencabut token yang dipakai |
| GET | `/me` | Pengguna, izin, dan jangkauannya |
| GET, PUT | `/profil` | Data diri sendiri |
| PUT | `/profil/kata-sandi` | Ganti kata sandi sendiri |

### Laporan harian

| Metode | Alamat | Keterangan |
|---|---|---|
| GET | `/laporan` | Berpagination. Saring `dari`, `sampai`, `status`, `departemen_id`, `cari`, `per_halaman` |
| POST | `/laporan` | Membuat draf. Satu laporan per pengguna per tanggal |
| GET, PUT, DELETE | `/laporan/{laporan}` | PUT dan DELETE hanya selama masih draf |
| POST | `/laporan/{laporan}/kirim` | Setelah dikirim, menjadi catatan |
| POST | `/laporan/{laporan}/tinjau` | Butuh `laporan.tinjau` |
| POST | `/laporan/{laporan}/lampiran` | Batas `unggah` |
| GET, DELETE | `/lampiran/{lampiran}` | Unduhan selalu lewat controller — tautan penyimpanan tidak pernah terbuka |

> **Menyunting laporan membangun ulang seluruh isinya.** `PUT /laporan/{id}`
> menghapus seluruh `sections` lalu menulisnya kembali; id baris **tidak
> bertahan** melewati satu penyuntingan. Apa pun yang menunjuk isi laporan harus
> menunjuk laporannya, bukan barisnya — itulah sebab pivot `tugas_laporan`
> menunjuk `daily_reports`.

### Papan progres harian

| Metode | Alamat | Keterangan |
|---|---|---|
| GET | `/tugas` | Dikelompokkan per kolom, **tanpa pagination** |
| POST, PUT, DELETE | `/tugas`, `/tugas/{tugas}` | Butuh `tugas.kelola` |
| PATCH | `/tugas/{tugas}/geser` | Hanya `status` dan `urutan` |

`geser` sengaja terpisah dari `update`: itu satu-satunya aksi yang dipicu
tarik-lepas, dan menyeret kartu tidak boleh gagal karena judulnya kebetulan
melewati batas panjang.

### Executive Analytics

Empat halaman, empat endpoint — bukan satu balasan raksasa. Pembacanya membuka
satu halaman pada satu waktu.

| Metode | Alamat | Isi |
|---|---|---|
| GET | `/analitik/opsi` | Departemen yang boleh dibaca, dan metrik yang tersedia |
| GET | `/analitik/departemen` | Keadaan tiap departemen, diringkas dari kolom templatenya sendiri |
| GET | `/analitik/ringkasan` | Kartu angka berpembanding, tren, dan kalimat "perlu perhatian" |
| GET | `/analitik/produktivitas` | Angka bersatuan dari isi laporan: kg, box, pouch |
| GET | `/analitik/progres` | Kartu papan progres, beban, telat, umur kartu |

> **`/analitik/kepatuhan` pernah ada dan dihapus.** Isinya mengukur orang, bukan
> pekerjaan, dan tabel per orangnya mengulang `GET /api/monitoring` yang sudah
> menyajikan jumlah laporan beserta hari tanpa laporan pada penyaringan yang
> sama. Dua tempat untuk satu pertanyaan hanya membuat keduanya lambat laun
> berbeda.

Penyaring yang diterima semuanya: `dari`, `sampai`, `departemen_id[]`, dan
`metrik` (khusus produktivitas). Rentang bawaan 30 hari terakhir; rentang
terpanjang 366 hari, dan permintaan yang lebih panjang dipotong, bukan ditolak.

**Dua jalur kebocoran, bukan satu.** Selain query yang lupa `visibleTo()`,
penyaring `departemen_id` dikirim pengguna sendiri. Terjemahannya dipusatkan di
`App\Support\Analitik\PenyaringAnalitik`, yang **membuang** departemen di luar
jangkauan sebelum satu angka pun dihitung — bukan menolaknya dengan galat, sebab
pesan "departemen itu di luar jangkauan Anda" pun sudah memberi tahu bahwa
departemen itu ada. `AnalitikTest` menguji keduanya, terhadap pemegang jangkauan
satu departemen.

Produktivitas membaca kolom angka bersatuan dari `daily_report_items.data`.
Metriknya dikenali dari pasangan **kunci dan satuan**, bukan kunci saja:
menjumlahkan kilogram dengan pouch karena namanya mirip menghasilkan angka yang
terlihat masuk akal dan sepenuhnya salah.

### Master data

| Metode | Alamat | Keterangan |
|---|---|---|
| GET, POST | `/master/jenis` | Daftar jenis |
| PUT, DELETE | `/master/jenis/{slug}` | |
| GET | `/master/{slug}` | Berpagination |
| GET | `/master/{slug}/cari` | Untuk Combobox: tiga kolom, dibatasi jumlahnya, hanya yang aktif |
| POST | `/master/{slug}` | Kode dibuat server dari nama, tidak diterima dari klien |
| PUT, DELETE | `/master/{slug}/{item}` | |
| GET | `/master/{slug}/template-import` | Berkas `.xlsx` siap diisi |
| POST | `/master/{slug}/import/pratinjau` | **Tidak menulis apa pun** |
| POST | `/master/{slug}/import` | Menulis, dalam satu transaksi |

### Template laporan dan import laporan

| Metode | Alamat | Keterangan |
|---|---|---|
| GET, POST | `/template` | |
| GET | `/template/opsi-kolom` | Tipe kolom, tampilan, dan pilihannya |
| GET, PUT, DELETE | `/template/{template}` | |
| GET | `/template/{template}/import/template` | Berkas `.xlsx` sesuai bentuk templatenya |
| POST | `/template/{template}/import/pratinjau` | **Tidak menulis apa pun** |
| POST | `/template/{template}/import` | Satu laporan draf per tanggal |

Kolom hitungan tidak ada di berkas template — nilainya dihitung server.
Tanggal yang sudah punya laporan **ditolak, bukan ditimpa**.

### Export

Preview-first, dan itu larangan tertulis (ADR-006): tidak ada unduhan langsung.

| Metode | Alamat |
|---|---|
| GET | `/export/pratinjau` |
| GET | `/export/excel` |
| GET | `/export/pdf` |

Pratinjau dan berkas memakai sumber data yang sama, sehingga isinya tidak pernah
berbeda dari yang sudah dilihat.

### Pengguna, peran, departemen

| Metode | Alamat | Keterangan |
|---|---|---|
| GET, POST | `/pengguna` | |
| PUT, DELETE | `/pengguna/{user}` | Menghapus hanya untuk akun tanpa jejak |
| PUT | `/pengguna/{user}/penetapan` | Peran beserta jangkauannya |
| PUT | `/pengguna/{user}/status` | Aktif atau nonaktif |
| PUT | `/pengguna/{user}/kata-sandi` | Membuang seluruh token pengguna itu |
| GET, POST | `/role` | |
| GET | `/izin` | Katalog izin, berkelompok |
| PUT | `/role/matriks` | Menyimpan seluruh matriks sekaligus |
| PUT, DELETE | `/role/{role}` | Peran sistem tidak dapat dihapus |
| GET, POST | `/departemen` | |
| PUT, DELETE | `/departemen/{department}` | |

### Monitoring dan notifikasi

| Metode | Alamat |
|---|---|
| GET | `/monitoring` |
| POST | `/monitoring/pengingat` |
| GET | `/notifikasi` |
| POST | `/notifikasi/{notifikasi}/baca` |
| POST | `/notifikasi/baca-semua` |

Satu pengingat per orang per hari, dari siapa pun — tanpa batas itu seorang
anggota dapat menerima belasan notifikasi yang sama dari beberapa atasan.

### Kesehatan

`GET /api/health` — tanpa autentikasi, untuk pemantauan. `GET /up` disediakan
Laravel untuk keperluan yang sama.

---

## 5. Format yang dipertukarkan

| Hal | Bentuk di API | Bentuk di layar |
|---|---|---|
| Tanggal | ISO `2026-08-05` | `5 Agustus 2026` |
| Waktu | ISO 8601 | `08.15 WIB` |
| Bulan | `2026-08` | `Agustus 2026` |
| Angka | angka JSON, titik desimal | `1.234,5` |

Pemformatan dikerjakan antarmuka, bukan API. Frontend memakai
`frontend/src/lib/format.ts`; backend memakai Carbon `translatedFormat` dengan
locale `id`.

Nilai kolom master disimpan sebagai **salinan** `{"kode": "...", "nama": "..."}`,
bukan kunci asing. Laporan adalah arsip: mengubah daftar master tidak boleh
mengubah isi laporan tahun lalu.
