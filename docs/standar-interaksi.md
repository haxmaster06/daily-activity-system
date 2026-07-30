# Standar Interaksi & Komponen

Arahan pemilik project, berlaku untuk seluruh antarmuka DAMS. Melengkapi
`.agents/Standarization/standarization.md`; bila keduanya berbeda, dokumen ini
yang dipakai.

---

## 1. Input Harus Praktis

Prinsipnya: **user tidak boleh mengetik apa yang sudah diketahui sistem.**

### 1.1 Ada master data, jangan ketik bebas

| Data | Kontrol |
|---|---|
| Departemen, role, supplier, customer, produk, satuan | `Select` bila pilihan ≤ 10 |
| Daftar panjang (supplier, item, LOT) | `Autocomplete` — ketik untuk menyaring, tetap terikat master data |
| Status, tahapan | `Select` atau `ToggleButtonGroup` |
| Tanggal | `DatePicker`, bukan input teks |
| Angka bersatuan | Input angka + `Select` satuan terpisah |

Isian teks bebas hanya untuk yang memang bebas: keterangan, temuan, deskripsi
aktivitas.

### 1.2 Autofill

Satu isian yang menentukan isian lain wajib mengisinya otomatis. Nilai hasil
autofill tetap dapat diubah user, kecuali memang tidak masuk akal untuk diubah.

Contoh yang berlaku di DAMS:

* Pilih **No SPK** → isi otomatis PO#, Nama Perusahaan, Kode Item, Deskripsi
* Pilih **Supplier** → sempitkan daftar LOT ke milik supplier itu
* Pilih **LOT** pada QC → isi otomatis Qty Masuk dari catatan penerimaan
* Isi **QTY Dibutuhkan** dan **QTY Selesai** → hitung otomatis Kekurangan
* Isi **QTY Masuk** dan **QTY Keluar** → hitung otomatis Waste dan persentase
* Pilih **Departemen** pada form pengguna → sempitkan daftar template terkait

Kolom hasil hitungan ditandai jelas (latar berbeda + label "dihitung otomatis")
agar user tahu itu bukan isian yang perlu diisi.

### 1.3 Checklist

* [ ] Tidak ada input teks bebas untuk data yang punya master
* [ ] Daftar panjang memakai Autocomplete, bukan `select` biasa
* [ ] Tanggal memakai DatePicker
* [ ] Isian turunan terisi otomatis, tidak diketik ulang
* [ ] Kolom hitungan ditandai dan tidak bisa diketik

---

## 2. Tab untuk Meringkas

Halaman yang memuat beberapa kelompok isi setara memakai **Tab**, bukan
gulungan panjang.

Dipakai ketika:

* Satu entitas punya beberapa sudut pandang — mis. Detail Laporan: *Aktivitas*,
  *Lampiran*, *Riwayat*
* Satu departemen punya beberapa template laporan — satu tab per template
* Halaman pengaturan memuat beberapa modul terpisah

Tidak dipakai ketika: isi tab saling bergantung dan harus dibaca berurutan —
itu wizard, bukan tab.

Ketentuan:

* Tab aktif tercatat di URL (`?tab=lampiran`) agar dapat dibagikan dan tombol
  kembali bekerja
* Jumlah item ditampilkan pada label bila relevan — "Aktivitas (12)"
* Perpindahan tab beranimasi; isi lama keluar, isi baru masuk
* Tab tidak boleh menyembunyikan galat validasi — tab yang memuat kolom
  bermasalah diberi penanda merah

---

## 3. Wizard untuk Isian Berantai

Isian yang **saling terhubung dan berurutan** memakai wizard bertahap, bukan
satu form panjang.

Dipakai untuk:

* Buat Laporan Harian: pilih tanggal & template → isi aktivitas → lampiran →
  tinjau & kirim
* Buat Template Laporan: identitas template → susun kolom → tinjau
* Impor data bertahap

Ketentuan:

* Indikator langkah selalu terlihat, menampilkan langkah selesai, sekarang,
  dan yang akan datang
* Langkah selesai dapat diklik untuk mundur; langkah di depan terkunci sampai
  langkah sekarang sah
* Validasi dijalankan per langkah, bukan menumpuk di akhir
* Isian tidak hilang saat mundur
* Langkah terakhir selalu berupa ringkasan sebelum menyimpan
* Perpindahan langkah beranimasi geser sesuai arah maju atau mundur

---

## 4. Animasi: Halus, Secukupnya

Arahan pemilik project. Menggantikan pembatasan animasi minimal pada
standarisasi §12.

Gerakan harus halus dan terasa hidup, **tetapi tidak berlebihan**. Setiap
animasi menjelaskan perubahan; yang tidak menjelaskan apa pun dihapus.

### 4.1 Nilai gerak

```
Cepat    (hover, press, ikon)          140ms   easeOut
Standar  (dropdown, tooltip, badge)    260ms   easeOut
Kompleks (modal, tab, wizard, halaman) 380ms   spring lembut
```

Spring bawaan: `{ type: 'spring', stiffness: 260, damping: 26, mass: 0.9 }` —
damping tinggi supaya mendarat tanpa memantul.

Easing keluar: `cubic-bezier(0.16, 1, 0.3, 1)` — cepat di awal, mendarat halus.

### 4.2 Pola

| Peristiwa | Gerakan |
|---|---|
| Halaman masuk | Naik 8px + memudar masuk |
| Modal | Skala 0.96 → 1 + memudar, latar ikut memudar |
| Tab | Isi lama memudar keluar, isi baru geser masuk 16px searah perpindahan |
| Langkah wizard | Geser mendatar sesuai arah maju/mundur |
| Baris tabel masuk | Bertahap, jeda 20ms antar baris, maksimal 8 baris pertama |
| Kartu statistik | Angka menghitung naik ke nilai akhirnya, sekali saat pertama tampil |
| Pemberitahuan | Turun dari atas, memudar keluar setelah selesai |
| Tombol ditekan | Skala 0.98 |

Jarak geser sengaja kecil (8–16px). Perpindahan yang terlalu jauh membuat
antarmuka padat terasa goyah.

### 4.3 Batas

* Animasi tidak pernah menahan input — user dapat mengetik atau menekan tombol
  selama animasi berjalan
* Elemen yang tidak sedang berinteraksi tidak bergerak sendiri
* Menghormati `prefers-reduced-motion`: seluruh gerakan disederhanakan menjadi
  memudar singkat. Ini syarat aksesibilitas, bukan pilihan

---

## 5. Library

Memakai library matang lebih baik daripada membuat ulang perilaku rumit.

| Kebutuhan | Library | Alasan |
|---|---|---|
| Lapisan komponen utama | **shadcn/ui** (Radix + CVA + Tailwind) | Kode disalin ke repo, jadi gayanya sepenuhnya milik kita — bukan tema pihak ketiga |
| Animasi | `motion` (Framer Motion) | Spring, layout animation, dan `AnimatePresence` untuk keluar-masuk |
| Efek gerak siap pakai | **React Bits** | Disalin manual dan disesuaikan token DAMS |
| Stepper, DatePicker, DataGrid | `@mui/material`, `@mui/x-date-pickers` | Tidak ada padanannya di shadcn |
| Tata letak dan gaya | Tailwind | Skala compact DAMS |
| Form dan validasi | `react-hook-form` + `zod` | Dibutuhkan form dinamis dari template |

### 5.1 Pembagian tugas antar library

Empat library UI dalam satu aplikasi mudah berubah jadi tampilan yang tidak
konsisten. Batasnya dibuat tegas:

**shadcn/ui — lapisan utama.** Tombol, input, select, dialog, tab, tabel,
badge, card, toast, popover, command. Komponennya disalin ke
`src/components/ui/` lalu disesuaikan token DAMS. Komponen baru dibuat di sini
lebih dulu, sebelum melirik library lain.

**MUI — hanya yang tidak ada di shadcn.** Saat ini: `Stepper` (wizard),
`DatePicker`, dan `Autocomplete` untuk daftar sangat panjang. Tombol, input
biasa, kartu, dan tata letak **tidak boleh** memakai MUI.

Alasannya: MUI memakai Emotion, shadcn memakai Tailwind. Menaruh keduanya pada
elemen yang sama membuat gaya sulit ditelusuri. Gaya MUI ditaruh pada CSS layer
tersendiri (`enableCssLayer`) sehingga utility Tailwind tetap menang tanpa
`!important`.

Seluruh komponen MUI wajib memakai tema DAMS di
`frontend/src/theme/mui-theme.ts`. Komponen MUI yang tampil dengan gaya
Material bawaan dianggap cacat.

**React Bits — efek gerak, bukan struktur.** Disalin manual ke
`src/components/ui/`, warnanya diganti token DAMS, durasinya disesuaikan §4.1.
Dipakai sebatas yang bermakna: angka statistik yang menghitung naik, daftar
yang muncul bertahap, penekanan pada hasil tindakan.

Yang dilarang dari React Bits: latar partikel, teks berkilau, kursor kustom,
kartu 3D miring, dan efek dekoratif lain yang tidak menyampaikan informasi.
Standarisasi §9–§10 tentang larangan tampilan generik tetap berlaku.

### 5.3 Komponen React Bits yang dipakai

Arahan pemilik project. Komponennya disalin ke `src/components/ui/`, warnanya
diganti token DAMS, durasinya disesuaikan §4.1.

| Kebutuhan | Komponen | Dipakai di |
|---|---|---|
| Visualisasi langkah | **Stepper** | Wizard buat laporan, wizard susun template |
| Menu samping | **Staggered Menu** | Drawer navigasi mobile |
| Daftar menu | **Animated List** | Menu akun, daftar pilihan, daftar notifikasi |
| Tab | **Pill Nav** | Detail laporan, pengelola template, pengaturan |
| Tombol kirim / masuk | **Spectacular Button** | Tombol aksi utama: Masuk, Kirim, Simpan |
| Kartu | **Border Glow** | Kartu statistik dan kartu yang dapat diklik |
| Navigasi bawah (mobile) | **Dock** | Navigasi utama pada layar sempit |

Catatan penerapan:

* **Staggered Menu bukan permanent sidebar.** Standarisasi §2.1 melarang
  sidebar permanen dan §30 menetapkan Horizontal Top Navigation Bar sebagai
  standar wajib. Staggered Menu dipakai sebagai drawer yang muncul saat tombol
  menu ditekan di layar sempit, lalu tertutup lagi.
* **Border Glow hanya sebagai umpan balik.** Menyala saat kursor berada di
  atas kartu yang memang dapat diklik. Kartu yang tidak interaktif tidak
  menyala — glow yang menyala terus-menerus melanggar §4.3.
* **Spectacular Button hanya untuk aksi utama.** Satu layar paling banyak
  punya satu tombol seperti ini. Tombol sekunder, Batal, dan ikon aksi pada
  tabel tetap memakai tombol biasa.
* **Dock menggantikan bilah navigasi atas hanya di layar sempit.** Di layar
  lebar tetap Horizontal Top Navigation Bar.
* **Pill Nav menggantikan tab MUI.** Setelah Pill Nav dipakai, MUI Tabs tidak
  lagi diperlukan.

### 5.2 Takaran animasi

Arahan pemilik project: **seperlunya saja, tidak berlebihan.**

Animasi dipakai untuk menjelaskan perubahan — apa yang muncul, apa yang
hilang, dari mana asalnya. Bukan untuk menghias. Bila sebuah gerakan
dihilangkan dan tidak ada informasi yang hilang, gerakan itu memang tidak
perlu ada.

---

## 6. Checklist Halaman Baru

Menambah pemeriksaan pada standarisasi §18:

* [ ] Data bermaster memakai Select atau Autocomplete
* [ ] Isian turunan terisi otomatis
* [ ] Kolom hitungan ditandai dan terkunci
* [ ] Isi yang setara dan banyak dikelompokkan dengan Tab
* [ ] Isian berantai memakai Wizard, bukan form panjang
* [ ] Perpindahan halaman, tab, dan langkah beranimasi
* [ ] `prefers-reduced-motion` dihormati
* [ ] Komponen MUI memakai tema DAMS, bukan gaya Material bawaan
