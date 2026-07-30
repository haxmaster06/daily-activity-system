# Standar UI/UX DAMS

Dokumen tunggal yang mengikat seluruh antarmuka DAMS.

Aturan **library** — Radix, React Aria, shadcn, React Bits — dipisah ke
`docs/standar-library-ui.md`. Dokumen ini mengatur perilaku antarmukanya.

## Urutan kewenangan

Bila dua dokumen berbeda, yang di atas menang:

1. **Dokumen ini** — `docs/standar-ui-ux.md` (perilaku antarmuka)
2. `docs/standar-library-ui.md` — library yang dipakai tiap komponen
3. `.agents/Standarization/standarization.md` — standar dasar (warna, tipografi, tata letak)
4. `mockup/UI UX Mockup/` — mockup yang disetujui

Mockup manajemen pengguna menggambar permanent sidebar. Standarisasi §2.1
melarangnya. **Yang dipakai standarisasi**, bukan mockup.

---

# BAGIAN 1 — INPUT

## 1.1 Prinsip

> **User tidak boleh mengetik apa yang sudah diketahui sistem.**

| Data | Kontrol |
|---|---|
| Pilihan ≤ 10 (departemen, role, satuan, status) | `Select` (Radix) |
| Daftar panjang (supplier, item, LOT, pengguna) | `Combobox` (React Aria) |
| Pilihan pendek yang layak terlihat sekaligus | `ButtonGroup` (Radix ToggleGroup) |
| Tanggal | `DatePicker` (React Aria) |
| Angka bersatuan | Input angka + `Select` satuan terpisah |
| Keterangan, temuan, deskripsi | Input teks bebas |

Isian teks bebas hanya untuk yang memang bebas.

## 1.2 Autofill

Satu isian yang menentukan isian lain wajib mengisinya otomatis. Hasil autofill
tetap dapat diubah user, kecuali memang tidak masuk akal diubah.

Yang berlaku di DAMS:

* Pilih **No SPK** → isi otomatis PO#, Nama Perusahaan, Kode Item, Deskripsi
* Pilih **Supplier** → sempitkan daftar LOT ke milik supplier itu
* Pilih **LOT** pada QC → isi otomatis Qty Masuk dari catatan penerimaan
* Isi **QTY Dibutuhkan** dan **QTY Selesai** → hitung otomatis Kekurangan
* Isi **QTY Masuk** dan **QTY Keluar** → hitung otomatis Waste dan persentase
* Pilih **Departemen** → sempitkan daftar template terkait

Kolom hasil hitungan ditandai jelas dan terkunci — user tahu itu bukan isian
yang perlu diisi. Rumusnya disimpan pada `template_fields.computed_from`.

## 1.3 Kode dibuat otomatis

**Kode penanda tidak pernah diketik pengguna.** Kode diturunkan dari nama oleh
server: huruf kapital, angka, dan garis bawah.

* "Research & Development" → `RESEARCH_DEVELOPMENT`
* Kode kembar diberi akhiran urut: `PRODUKSI`, `PRODUKSI_2`, `PRODUKSI_3`
* Kode yang dikirim klien diabaikan — penanda sistem bukan urusan antarmuka

**Kode tidak pernah berubah setelah dibuat.** Nama boleh diperbaiki kapan saja;
kodenya sudah menjadi rujukan seeder, template, dan data lama. Pada form ubah,
kode ditampilkan sebagai keterangan baca-saja, bukan isian.

Berlaku untuk `departments.code` dan `report_templates.code`. Kode
dibangkitkan `App\Support\KodeOtomatis`.

Hal yang sama berlaku pada **kunci kolom template**: terisi otomatis dari
label kolom, dan diberi keterangan bahwa itu penanda sistem.

## 1.4 Kunci teknis tidak pernah tampil

Nama kolom database tidak boleh bocor jadi label layar. `progress_status`
ditampilkan sebagai "Status". Pada penyusun template, kunci kolom terisi
otomatis dari label dan diberi keterangan bahwa itu penanda sistem.

## 1.5 Checklist

* [ ] Tidak ada input teks bebas untuk data yang punya master
* [ ] Daftar panjang memakai Combobox, bukan Select
* [ ] Tanggal memakai DatePicker
* [ ] Isian turunan terisi otomatis
* [ ] Kolom hitungan ditandai dan terkunci
* [ ] Tidak ada nama kolom database yang tampil ke layar
* [ ] Kode penanda dibuat server, bukan diketik pengguna

---

# BAGIAN 2 — TAB

Halaman yang memuat beberapa kelompok isi **setara** memakai Tab, bukan
gulungan panjang. Komponennya `PillNav`.

Dipakai ketika:

* Satu entitas punya beberapa sudut pandang — Detail Laporan: *Aktivitas*,
  *Lampiran*, *Riwayat*
* Satu departemen punya beberapa template — satu tab per departemen
* Halaman pengaturan memuat beberapa modul terpisah

**Tidak** dipakai ketika:

* Isi tab saling bergantung dan harus dibaca berurutan — itu wizard
* **Jumlah tabnya tumbuh mengikuti data.** Tab horizontal berhenti terbaca di
  atas ±7 item: sisanya tergulir keluar layar dan harus dicari satu per satu.
  Kelompok yang jumlahnya bertambah — per departemen, per pengguna, per
  supplier — memakai **bar filter + tabel** dengan penyaringan server, seperti
  halaman Manajemen Pengguna dan Template Laporan

Patokannya: tab dipakai bila daftar kelompoknya **tetap dan sudah diketahui
sejak awal**.

Ketentuan:

* Tab aktif tercatat di URL (`?tab=lampiran`) agar dapat dibagikan dan tombol
  kembali peramban bekerja
* Jumlah item ditampilkan pada label bila relevan — "Aktivitas (12)"
* Tab yang memuat kolom bermasalah diberi penanda merah — validasi tidak boleh
  tersembunyi di balik tab
* Perpindahan beranimasi searah geraknya

---

# BAGIAN 3 — WIZARD

Isian yang **saling terhubung dan berurutan** memakai wizard, bukan satu form
panjang. Komponennya `Wizard` + `Stepper`.

Dipakai untuk:

* Buat Laporan Harian: pilih tanggal & template → isi aktivitas → lampiran →
  tinjau & kirim
* Buat Template Laporan: identitas → susun kolom → tinjau
* Impor data bertahap

Ketentuan:

* Indikator langkah selalu terlihat: selesai, sekarang, dan yang akan datang
* Langkah selesai dapat diklik untuk mundur; langkah di depan terkunci sampai
  langkah sekarang sah
* Validasi per langkah, bukan menumpuk di akhir
* Isian tidak hilang saat mundur
* Langkah terakhir selalu ringkasan sebelum menyimpan
* Perpindahan beranimasi geser sesuai arah maju atau mundur

---

# BAGIAN 4 — ANIMASI

## 4.1 Takaran

> **Halus dan terasa hidup, tetapi secukupnya.**

Animasi menjelaskan perubahan — apa yang muncul, apa yang hilang, dari mana
asalnya. Bukan hiasan. Bila sebuah gerakan dihilangkan dan tidak ada informasi
yang hilang, gerakan itu memang tidak perlu ada.

Bagian ini menggantikan pembatasan animasi minimal pada standarisasi §12.

## 4.2 Nilai gerak

```
Cepat    (hover, press, ikon)          140ms   easeOut
Standar  (dropdown, tooltip, badge)    260ms   easeOut
Kompleks (modal, tab, wizard, halaman) 380ms   spring lembut
```

Spring: `{ type: 'spring', stiffness: 260, damping: 30, mass: 0.8 }` — damping
tinggi supaya mendarat tanpa memantul.

Easing keluar: `cubic-bezier(0.16, 1, 0.3, 1)`.

Nilainya ada di `frontend/src/lib/gerak.ts` dan `tailwind.config.ts`. Jangan
menulis angka durasi langsung di komponen.

## 4.3 Pola

| Peristiwa | Gerakan |
|---|---|
| Halaman masuk | Naik 8px + memudar masuk |
| Modal | Skala 0.96 → 1 + memudar, latar ikut memudar |
| Drawer | Geser dari kanan |
| Tab | Isi lama memudar keluar, isi baru geser masuk 16px searah perpindahan |
| Penanda tab & menu | Meluncur antar posisi (`layoutId`), bukan muncul-hilang |
| Langkah wizard | Geser mendatar sesuai arah |
| Baris tabel masuk | Bertahap, jeda 20ms, maksimal 8 baris pertama |
| Kartu statistik | Angka menghitung naik, sekali saat pertama tampil |
| Kartu dapat diklik | Tepi menyala mengikuti kursor |
| Tombol utama | Sapuan cahaya saat kursor di atasnya |
| Tombol ditekan | Skala 0.98 |

Jarak geser sengaja kecil (8–16px). Perpindahan terlalu jauh membuat antarmuka
padat terasa goyah.

## 4.4 Batas

* Animasi **tidak pernah menahan input** — user dapat mengetik atau menekan
  tombol selama animasi berjalan. Karena itu animasi overlay ditangani CSS
  lewat `data-entering` / `data-exiting`, bukan JavaScript
* Elemen yang tidak sedang berinteraksi tidak bergerak sendiri
* Border Glow hanya pada kartu yang memang dapat diklik
* Spectacular Button paling banyak satu per layar
* **`prefers-reduced-motion` dihormati** — seluruh gerakan disederhanakan
  menjadi memudar singkat. Ini syarat aksesibilitas, bukan pilihan

---

# BAGIAN 5 — NAVIGASI

## 5.1 Layar lebar (≥ md)

**Horizontal Top Navigation Bar** dua baris:

* Baris 1: logo, notifikasi, pengaturan, menu akun
* Baris 2: menu utama sesuai role, penanda aktif meluncur

**Permanent sidebar dilarang** (standarisasi §2.1).

## 5.2 Layar sempit (< md)

* **Dock** menempel di bawah — ikon + label, ikon aktif membesar tipis
* **Staggered Menu** di kanan atas — drawer yang tertutup lagi setelah dipakai

Staggered Menu **bukan** sidebar permanen. Ia muncul saat diminta, lalu hilang.

Dock sengaja tidak membesar berantai ala macOS: pada aplikasi kerja itu
menyulitkan sasaran sentuh.

## 5.3 Breadcrumb

Tiap halaman fitur punya breadcrumb yang dapat diklik, memakai komponen
bersama.

## 5.4 Penjagaan akses

Menyembunyikan menu tidak cukup — alamat halaman tetap dapat diketik. Halaman
terbatas wajib memanggil `wajibAkses()`, dan backend tetap menegakkan Policy
sendiri. Deny by default.

---

# BAGIAN 6 — TABEL & GULIR

## 6.1 Batang gulir menyembunyikan diri

Batang gulir tidak terlihat saat wadahnya diam. Batangnya muncul ketika kursor
berada di atas wadah, saat wadahnya menerima fokus, dan saat sedang digulir.
Lebarnya 8px, ujungnya membulat.

Ruang batangnya tetap dipesan agar isi tidak bergeser saat batangnya muncul —
pergeseran satu baris ketika kursor lewat jauh lebih mengganggu daripada
batang gulir itu sendiri.

Konsekuensi yang harus ditangani: batang yang tersembunyi menghilangkan
petunjuk bahwa isi masih dapat digulir. Karena itu wadah gulir wajib punya
petunjuk lain:

* Daftar pilihan memakai tombol gulir atas dan bawah
* Tabel dibatasi tepi kartu yang jelas, dengan bar pagination di bawahnya
* Baris terakhir yang terpotong sebagian sudah menjadi petunjuk tersendiri —
  jangan menyetel tinggi wadah tepat pada kelipatan tinggi baris

Diterapkan global di `globals.css`, bukan per komponen.

## 6.2 Tabel

* Header sticky, latar solid
* Tinggi dibatasi ~11 baris; **hanya badan yang menggulir**, bukan halaman
* Pencarian, penyaringan, pengurutan, dan pagination dikerjakan **server**
* Keadaan filter disimpan di URL agar dapat dibagikan dan dikosongkan sekaligus
* Setiap perubahan filter mengembalikan tampilan ke halaman pertama
* Bar pagination menampilkan "Menampilkan 1–25 dari 132 pengguna"
* Keadaan kosong menjelaskan penyebabnya, bukan sekadar "Tidak ada data"
* Halaman **tidak pernah menggulir mendatar** — tabel menggulir di dalam
  dirinya sendiri
* `truncate` **dilarang** untuk isi bermakna: judul, nama, deskripsi aktivitas

---

# BAGIAN 7 — FORM

* Form **≤ 8 field** memakai modal
* Form **> 8 field** atau yang punya lampiran memakai halaman tersendiri
* Isian berantai memakai wizard
* Tinggi input 32–40px, teks 13–14px
* Input **tidak** berlatar abu-abu default
* Tiap isian dibungkus `Field` agar label, bantuan, dan galat tersambung ke
  pembaca layar
* Galat tampil di bawah isian yang bermasalah, bukan hanya menumpuk di atas
* Tombol aksi di kanan bawah: **Batal** lalu **aksi utama**

---

# BAGIAN 8 — BAHASA

* Seluruh teks yang dilihat user memakai **Bahasa Indonesia**
* Tanpa jargon: Kirim (bukan Submit), Hapus (bukan Delete), Perbarui (bukan
  Update), Batal (bukan Cancel), Setujui (bukan Approve), Draf (bukan Draft)
* Tanggal `30 Juli 2026`; waktu 24 jam pemisah titik `08.15 WIB`
* Frontend lewat `lib/format.ts` — jangan memanggil `toLocaleDateString`
  langsung
* Pesan error ke user: kalimat ramah + kode referensi (`ERR-20260730-001`).
  Detail teknis hanya ke log
* **Pesan galat framework tidak boleh bocor.** Pesan diturunkan dari kode
  status, bukan dari pesan exception

---

# BAGIAN 9 — LARANGAN

* Permanent sidebar
* Dark mode — DAMS light mode saja
* Gradient dekoratif, card berlebihan, rounded acak
* Deskripsi pengisi ruang di bawah judul halaman
* `truncate` pada isi bermakna
* Halaman menggulir mendatar
* Badge status yang hanya membedakan lewat warna — wajib disertai ikon atau
  teks
* Isian Kode yang dapat diketik pengguna — kode selalu dibuat otomatis (§1.3)
* Export langsung unduh — wajib **preview-first**
* Angka tanpa konteks pada kartu statistik
* Komponen UI dari library di luar Radix / React Aria tanpa alasan tertulis
  di `docs/standar-library-ui.md` §9

---

# BAGIAN 10 — CHECKLIST HALAMAN BARU

* [ ] Navigasi memakai Top Nav (lebar) dan Dock + Staggered Menu (sempit)
* [ ] Breadcrumb dapat diklik
* [ ] Data bermaster memakai Select atau Combobox
* [ ] Isian turunan terisi otomatis; kolom hitungan terkunci
* [ ] Isi setara yang banyak dikelompokkan dengan Tab
* [ ] Isian berantai memakai Wizard
* [ ] Tabel: header sticky, badan menggulir, filter dan pagination server-side
* [ ] Keadaan kosong, memuat, dan galat semuanya ditangani
* [ ] Seluruh teks Bahasa Indonesia, tanpa nama kolom database
* [ ] Animasi memakai nilai dari `lib/gerak.ts`
* [ ] Library komponen sesuai `docs/standar-library-ui.md` §2
* [ ] `prefers-reduced-motion` dihormati
* [ ] Halaman terbatas memanggil `wajibAkses()`
* [ ] Tidak ada komponen MUI
