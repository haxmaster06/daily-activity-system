# UI/UX DESIGN SYSTEM & VISUAL STANDARD

## 1. Design Philosophy

Daily Activity Monitoring System (DAMS) harus memiliki tampilan yang:

* Modern
* Profesional
* Ringkas
* Fungsional
* Efisien
* Konsisten
* Tidak berlebihan
* Tidak terlihat seperti template AI generik

Prinsip utama:

> **UI harus membantu user menyelesaikan pekerjaan, bukan memamerkan desain.**

Setiap elemen visual harus memiliki alasan fungsional.

---

# 2. Application Navigation

## 2.1 Horizontal Top Navigation Bar

DAMS menggunakan **Horizontal Top Navigation Bar** sebagai navigasi utama.

Layout:

```text
┌──────────────────────────────────────────────────────────┐
│ DAMS   Dashboard  Laporan Saya  Monitoring  Export  ⚙   │
│        ─────────                                    🔔 👤│
├──────────────────────────────────────────────────────────┤
│                                                          │
│                    MAIN CONTENT                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

DAMS **tidak menggunakan permanent sidebar**.

Dilarang menggunakan pola:

```text
┌────────────┬────────────────────┐
│            │                    │
│  SIDEBAR   │   MAIN CONTENT     │
│            │                    │
│  Dashboard │                    │
│  Laporan   │                    │
│  Monitoring│                    │
│            │                    │
└────────────┴────────────────────┘
```

---

## 2.2 Navigation Structure

Top bar memiliki dua baris:

**Baris 1 (Header Bar):**

```text
Logo DAMS (kiri) | Judul halaman | 🔔 Notifikasi | ⚙ Pengaturan | 👤 Avatar + Nama
```

**Baris 2 (Navigation Bar):**

```text
Dashboard | Laporan Saya | Monitoring | Export | Pengaturan
```

Menu aktif ditandai dengan:

* Garis bawah biru tebal
* Teks berwarna biru (primary)

---

## 2.3 Navigation Rules

Navigation bar harus:

* Selalu terlihat di semua halaman (kecuali Login)
* Menampilkan menu berdasarkan role user
* Menu aktif memiliki indikator visual yang jelas
* Konsisten di seluruh halaman

Visibility berdasarkan role:

| Menu | Staff | Supervisor | Manager | Admin |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Laporan Saya | ✅ | ✅ | ✅ | ✅ |
| Monitoring | ❌ | ✅ | ✅ | ✅ |
| Export | ✅ | ✅ | ✅ | ✅ |
| Pengaturan | ❌ | ❌ | ❌ | ✅ |

---

## 2.4 Breadcrumb Navigation

Setiap halaman fitur diawali breadcrumb yang **dapat diklik**:

```text
Dashboard  ›  Laporan Saya  ›  Detail Laporan
  ▲              ▲                ▲
  │              │                └─ halaman saat ini (teks biasa)
  │              └─ halaman induk
  └─ Dashboard utama
```

Aturan:

* Tingkat **Dashboard** selalu menuju halaman utama.
* Tingkat terakhir adalah halaman aktif — **bukan tautan**.
* Breadcrumb menggunakan komponen bersama, tidak dibuat ulang tiap halaman.

---

# 3. Color System

## 3.1 Color Mode

DAMS menggunakan **Light Mode saja** (dominan terang).

Tidak ada dukungan dark mode.

## 3.2 Primary Colors

| Token | Hex | Penggunaan |
|---|---|---|
| Primary | `#1A73E8` | Tombol utama, link, menu aktif, aksen |
| Secondary | `#00BFA5` | Indikator positif, grafik |
| Accent | `#FF8F00` | Peringatan, badge "Dalam Proses" |
| Background | `#F5F7FA` | Latar belakang halaman |
| Surface | `#FFFFFF` | Card, form, modal |

## 3.3 Status Colors

```text
Selesai       → Hijau     (teal/green)
Dalam Proses  → Kuning    (amber/yellow)
Belum Mulai   → Abu-abu   (gray)
Draft         → Kuning    (amber)
Terkirim      → Biru      (primary blue)
Belum Laporan → Merah muda (red/pink)
Sudah Laporan → Hijau     (green)
```

Warna status harus konsisten di seluruh halaman. Badge status selalu menggunakan warna yang sama di mana pun ditampilkan.

## 3.4 Color Rules

Color digunakan untuk:

* Hierarchy
* Status
* Feedback
* Focus

Bukan untuk menghias setiap elemen.

Warna harus konsisten di seluruh halaman.

---

# 4. Form Design Standard

## 4.1 Compact Form

Form harus memiliki ukuran yang efisien.

Input tidak boleh terlalu besar secara vertikal.

Dihindari:

```text
┌──────────────────────────────────┐
│                                  │
│                                  │
│          Nama Lengkap            │
│                                  │
│                                  │
└──────────────────────────────────┘
```

Direkomendasikan:

```text
Nama Lengkap
[ Ahmad                         ]
```

---

## 4.2 Input Height

Ukuran input direkomendasikan:

```text
Input Height:
32px - 40px
```

Untuk input utama:

```text
36px - 40px
```

Untuk compact control:

```text
32px - 36px
```

Tidak menggunakan input berukuran besar tanpa alasan UX yang jelas.

---

# 5. Input Background

## 5.1 Avoid Generic Gray Input

Hindari penggunaan input dengan background abu-abu sebagai default:

```text
┌──────────────────────────────┐
│                              │
│       Background Abu-Abu     │
│                              │
└──────────────────────────────┘
```

Karena pola ini sering membuat interface terlihat:

* Generic
* Datar
* Seperti template dashboard
* Kurang premium

---

## 5.2 Recommended Input Style

Gunakan:

* Background putih atau surface utama
* Border tipis
* Focus state yang jelas
* Kontras yang cukup
* Shadow minimal atau tanpa shadow

Contoh:

```text
Nama Lengkap

┌──────────────────────────────┐
│ Ahmad                        │
└──────────────────────────────┘
```

Focus:

```text
┌──────────────────────────────┐
│ Ahmad                        │
└──────────────────────────────┘
        Focus State (border biru)
```

---

# 6. Application Scale

## 6.1 General UI Scale

Ukuran dasar aplikasi berada pada skala:

> **12px - 14px sebagai baseline visual UI**

Recommended scale:

| Element            |        Size |
| ------------------ | ----------: |
| Metadata / Caption | 10px - 11px |
| Secondary Text     | 11px - 12px |
| Body Text          | 12px - 14px |
| Form Label         | 11px - 12px |
| Input Text         | 12px - 14px |
| Table Text         | 11px - 13px |
| Page Title         | 18px - 24px |
| Section Title      | 14px - 18px |

Prinsip:

> **Compact, tetapi tetap nyaman dibaca.**

DAMS adalah aplikasi internal yang menampilkan banyak data aktivitas harian. UI tidak boleh menggunakan skala yang terlalu besar seperti landing page marketing.

---

# 7. Information Density

DAMS menggunakan:

> **High Information Density with Clear Hierarchy**

Tujuan:

* Lebih banyak informasi terlihat
* Mengurangi scrolling
* Mempercepat pekerjaan user
* Tetap menjaga keterbacaan

Contoh:

```text
Bad:

Judul Besar Sekali

Deskripsi panjang yang menjelaskan
sesuatu yang sebenarnya sudah cukup jelas
dari judul dan konteks halaman.

[ Tombol Besar ]
```

Recommended:

```text
Laporan Harian

[ + Buat Laporan Baru ]

Filter: [Tanggal] [Status] [Cari]

┌────────────────────────────────────┐
│ Data Laporan                       │
└────────────────────────────────────┘
```

---

# 8. Avoid Unnecessary Descriptions

## 8.1 General Rule

Deskripsi hanya digunakan jika:

> **Tanpa deskripsi, user akan kesulitan memahami fungsi atau tindakan tersebut.**

Jangan menambahkan deskripsi hanya untuk mengisi ruang kosong.

---

## 8.2 Avoid

```text
Laporan Harian

Silakan gunakan fitur ini untuk membuat laporan
harian baru yang nantinya dapat dipantau oleh
supervisor dan manager departemen Anda.
```

Jika konteks sudah jelas, cukup:

```text
Laporan Harian

[ + Buat Laporan Baru ]
```

---

## 8.3 Use Concise Context

Jika deskripsi diperlukan:

```text
Kelola laporan aktivitas harian departemen.
```

Bukan:

```text
Halaman ini digunakan untuk membantu Anda dalam
melakukan proses pengelolaan laporan aktivitas
harian perusahaan secara terstruktur dan terintegrasi.
```

---

# 9. AI Slop Prevention

## 9.1 Definition

DAMS harus menghindari pola visual yang terlihat seperti hasil generate AI tanpa design direction yang jelas.

Contoh pola yang harus dihindari:

* Terlalu banyak rounded card
* Semua elemen memiliki shadow
* Gradient yang tidak memiliki fungsi
* Excessive glassmorphism
* Terlalu banyak warna aksen
* Dashboard penuh card statistik tanpa hierarki
* Deskripsi panjang pada setiap elemen
* Icon yang tidak konsisten
* Random border radius
* Semua tombol dibuat besar
* Spacing yang terlalu longgar
* Layout generik SaaS template
* Hero section yang tidak relevan

---

# 10. Anti-AI-Slop Design Principles

## 10.1 Design with Hierarchy

Tidak semua elemen harus terlihat penting.

Gunakan hirarki:

```text
Primary
   ↓
Secondary
   ↓
Supporting
   ↓
Metadata
```

Contoh:

```text
Laporan Harian — 30 Juli 2026    ← Primary

Pelapor: Ahmad Fauzi              ← Secondary

Departemen: Produksi              ← Supporting

Dibuat: 30 Jul 2026, 08:15 WIB   ← Metadata
```

---

## 10.2 Avoid Card Everything

Tidak semua komponen harus dibungkus card.

Gunakan card hanya jika:

* Memisahkan konteks
* Mengelompokkan informasi
* Menjadi interactive object
* Membantu struktur visual

---

## 10.3 Avoid Excessive Rounded Corners

Border radius harus konsisten dan proporsional.

Recommended:

```text
Small Control: 4px - 6px
Input: 6px - 8px
Card: 8px - 12px
Modal: 12px - 16px
```

---

# 11. Iconography

Icon harus:

* Konsisten
* Sederhana
* Memiliki makna
* Tidak berlebihan

Icon digunakan untuk:

* Navigation
* Action
* Status
* Context

Jangan menggunakan icon hanya karena:

> "Area ini terlihat kosong."

---

# 12. Animation Standard

Animation harus memiliki tujuan.

## Allowed

* Page transition
* Modal opening
* Dropdown
* Loading
* Feedback
* Hover interaction

## Avoid

* Excessive bouncing
* Continuous animation
* Decorative floating elements
* Slow transition
* Animation yang menghalangi pekerjaan user

Recommended:

```text
Fast Interaction:
100ms - 150ms

Standard Transition:
150ms - 250ms

Complex Transition:
250ms - 400ms
```

---

# 13. Page Layout Standard

Setiap halaman harus memiliki struktur sederhana:

```text
┌──────────────────────────────────────┐
│ Page Title                Primary CTA │
│                                      │
│ Filters / Actions                    │
│                                      │
│ Main Content                         │
│                                      │
└──────────────────────────────────────┘
```

Contoh:

```text
Laporan Saya                  [ + Buat Laporan ]

[Status ▾] [Tanggal ▾] [Cari...]         [Terapkan]

┌────────────────────────────────────────────┐
│ Tanggal | Departemen | Aktivitas | Status  │
├────────────────────────────────────────────┤
│ 30 Jul  | Produksi   | 5         | Terkirim│
└────────────────────────────────────────────┘
```

---

# 14. Dashboard Layout

Dashboard utama mengikuti pola yang sudah ditetapkan di mockup:

```text
┌──────────────────────────────────────────────┐
│ [Stat 1] [Stat 2] [Stat 3] [Stat 4]         │  ← Kartu Statistik
├──────────────────────────────────────────────┤
│ Grafik Departemen (60%)  │ Timeline (40%)    │  ← Konten 2 Kolom
├──────────────────────────────────────────────┤
│                          [+ Buat Laporan]    │  ← FAB pojok kanan bawah
└──────────────────────────────────────────────┘
```

Kartu statistik dashboard menampilkan:

* Total Laporan Hari Ini
* Aktivitas Selesai
* Belum Selesai
* Departemen Aktif

Grafik batang horizontal menampilkan aktivitas per departemen. Timeline menampilkan 5 aktivitas terbaru.

---

# 15. Export Preview-First Flow

Export laporan **tidak langsung download**. User wajib melihat preview terlebih dahulu.

Flow:

```text
User memilih filter
        ↓
Klik "Tampilkan Preview"
        ↓
Preview laporan tampil (paper-like)
        ↓
Pilih: Export Excel / Export PDF / Cetak
```

Layout halaman export:

```text
┌────────────┬──────────────────────────────────┐
│ Filter     │  [Export Excel] [Export PDF] [🖨] │
│ Panel      │                                  │
│ (250px)    │  ┌─────────────────────────────┐  │
│            │  │    Preview Laporan          │  │
│ Departemen │  │    (paper-like, shadow)     │  │
│ Periode    │  │                             │  │
│ Rentang    │  │    Header: Logo + Company   │  │
│ Format     │  │    Tabel Aktivitas          │  │
│            │  │    Footer: Timestamp        │  │
│ [Preview]  │  └─────────────────────────────┘  │
└────────────┴──────────────────────────────────┘
```

---

# 16. Monitoring Layout

Halaman monitoring untuk supervisor mengikuti pola:

```text
┌──────────────────────────────────────────────┐
│ [Anggota Tim: 12] [Sudah: 9] [Belum: 3]     │  ← Kartu Ringkasan
├──────────────────────────────────────────────┤
│ Filter: [Anggota] [Tanggal] [Status]         │
├──────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│ │ Ahmad F  │ │ Siti A   │ │ Budi S   │      │  ← Grid Card 3 Kolom
│ │ ✅ Sudah │ │ ✅ Sudah │ │ ❌ Belum │      │
│ └──────────┘ └──────────┘ └──────────┘      │
├──────────────────────────────────────────────┤
│ Riwayat Laporan Terbaru (Tabel)              │
└──────────────────────────────────────────────┘
```

Indikator status harus jelas:
* **Sudah Laporan**: Badge hijau + ikon centang
* **Belum Laporan**: Badge merah + ikon peringatan + tombol "Kirim Pengingat"

---

# 17. AI Development UI Instruction

Setiap prompt yang diberikan kepada AI coding agent wajib menyertakan:

```text
## UI/UX REQUIREMENTS

- Gunakan Bahasa Indonesia untuk seluruh user-facing text.
- Jangan tampilkan pesan teknis kepada user.
- Jangan gunakan permanent sidebar.
- Gunakan Horizontal Top Navigation Bar.
- Gunakan compact enterprise UI.
- Hindari input form berukuran terlalu besar.
- Hindari default gray input background.
- Gunakan skala visual compact sekitar 12-14px untuk body text.
- Hindari deskripsi yang tidak diperlukan.
- Hindari excessive card usage.
- Hindari excessive rounded corners.
- Hindari gradient dan dekorasi tanpa fungsi.
- Hindari tampilan generik AI-generated SaaS.
- Prioritaskan informasi dan workflow.
- Gunakan spacing yang efisien.
- Gunakan design hierarchy yang jelas.
- Gunakan icon secara konsisten.
- Light mode only. Tidak ada dark mode.
- Export harus preview-first, bukan langsung download.
- Breadcrumb navigation di setiap halaman.
- Badge status konsisten di seluruh halaman.
- Referensi mockup di folder mockup/UI UX Mockup/.
```

---

# 18. Frontend Quality Gate

Setiap halaman baru harus melewati pemeriksaan:

### Navigation

* [ ] Tidak menggunakan permanent sidebar
* [ ] Horizontal top nav bar tersedia
* [ ] Menu sesuai role user
* [ ] Breadcrumb tersedia dan dapat diklik

### Form

* [ ] Input tidak terlalu besar
* [ ] Background tidak menggunakan abu-abu generik
* [ ] Label jelas
* [ ] Validasi menggunakan Bahasa Indonesia

### Typography

* [ ] Skala UI compact
* [ ] Hierarki informasi jelas
* [ ] Tidak ada text berlebihan

### Content

* [ ] Tidak ada deskripsi yang tidak diperlukan
* [ ] Button menggunakan bahasa yang jelas
* [ ] Status menggunakan Bahasa Indonesia

### Visual

* [ ] Tidak terlalu banyak card
* [ ] Tidak terlalu banyak rounded corner
* [ ] Tidak ada dekorasi tanpa fungsi
* [ ] Tidak terlihat seperti AI-generated template
* [ ] Konsisten dengan mockup yang sudah disetujui

### Error

* [ ] Tidak ada technical error di UI
* [ ] Pesan error mudah dipahami
* [ ] Error memiliki tindakan yang jelas jika memungkinkan

---

# 19. State Memuat — Skeleton

## 19.1 Aturan

Gunakan skeleton loading untuk menampilkan state memuat data.

Skeleton menempati ruang seukuran kontennya, sehingga tidak ada lompatan layout saat data tiba.

## 19.2 Kerangka Sebentuk Isinya

| Isi | Skeleton |
|-----|----------|
| Tabel | Skeleton tabel (jumlah kolom disamakan) |
| Kartu statistik | Skeleton kartu |
| Daftar baris (timeline) | Skeleton daftar |
| Paragraf / isi bebas | Skeleton teks |

## 19.3 Checklist

* [ ] Kerangka meniru bentuk isi yang digantikannya
* [ ] Jumlah kolom/baris kerangka mendekati isi asli
* [ ] Tidak ada lompatan tata letak saat data tiba

---

# 20. Aksesibilitas Dasar

## 20.1 Kontras

* Seluruh teks harus memiliki kontras minimal **4.5:1** terhadap latar belakang.
* Badge status harus tetap terbaca.

## 20.2 Fokus

* Setiap elemen interaktif harus punya fokus state terlihat.
* `outline: none` tanpa pengganti yang jelas dilarang.

## 20.3 Jangan Warna Saja

Status dan peringatan harus disertai ikon atau teks, tidak boleh dibedakan lewat warna saja.

## 20.4 Semantik

* Tombol ikon harus punya `aria-label`.
* Pesan galat form harus tertaut ke kolomnya.

---

# 21. Tabel Data

## 21.1 Header Tetap

* Header tabel **menempel** (sticky) saat isinya digulir.
* Latar solid pada header agar baris badan tidak menembus.

## 21.2 Tinggi Tetap, Badan yang Menggulir

* Tinggi tabel dibatasi (~11 baris).
* Yang menggulir adalah **badan tabel**, bukan seluruh halaman.
* Header halaman, breadcrumb, dan filter tidak ikut bergeser.

## 21.3 Pagination

* Server-side pagination untuk daftar besar.
* Bar pagination: "Menampilkan X dari Y laporan" dengan tombol halaman.

## 21.4 Checklist

* [ ] Header sticky dengan latar solid
* [ ] Tinggi dibatasi; hanya badan yang menggulir
* [ ] Pagination muncul saat data melebihi satu halaman

---

# 22. Pola Interaksi

## 22.1 Modal vs Halaman Tersendiri

| Kondisi | Pola |
| ------- | ---- |
| ≤ 8 field, satu langkah | **Modal** |
| > 8 field, atau ada lampiran | **Halaman tersendiri** |
| Konfirmasi tindakan (hapus, nonaktifkan) | **Dialog konfirmasi** |

Contoh Modal: tambah user, tambah departemen, edit profil.
Contoh halaman tersendiri: buat laporan harian (tabel aktivitas + lampiran).

Ketentuan Modal:

* Tombol aksi di kanan bawah: **Batal** lalu aksi utama.
* Dapat ditutup dengan Escape dan klik area luar.
* Menampilkan status memproses pada tombol (mis. "Menyimpan...").

## 22.2 Floating Action Button

Dashboard menampilkan FAB "Buat Laporan Baru" di pojok kanan bawah — shortcut ke fitur utama.

## 22.3 Checklist

* [ ] Form ≤ 8 field memakai Modal, bukan halaman baru
* [ ] Tindakan berisiko memakai dialog konfirmasi
* [ ] FAB dashboard tersedia dan menonjol

---

# 23. Tanpa Overflow & Teks Panjang

## 23.1 Tidak Boleh Ada Overflow

Tata letak tidak boleh jebol. Penyebab umum dan penangkalnya:

| Penyebab | Penangkal |
|---|---|
| Kata tanpa spasi (kode, email, URL) | `overflow-wrap: break-word` global |
| Anak flex tidak mau menyusut | `min-w-0` pada anak flex |
| Tabel lebih lebar dari layar | Scroll di dalam tabel, bukan di halaman |

## 23.2 Teks Panjang: Jangan Dipotong

**`truncate` dilarang untuk isi bermakna** (judul, nama, deskripsi aktivitas). Biarkan teks membungkus penuh.

---

# 24. Filter Tabel

Setiap tabel daftar wajib menyediakan penyaringan yang relevan.

## 24.1 Aturan

* **Minimal ada pencarian teks** pada kolom identitas baris.
* **Tambah filter sesuai dimensi data:**
  * Punya **status** → filter status
  * Punya **tanggal** → rentang tanggal (dari–sampai)
  * Punya **departemen** → filter departemen
* **Filter dijalankan di server** untuk daftar ter-paginate.
* **Keadaan filter terlihat** dan dapat dikosongkan.

## 24.2 Checklist

* [ ] Ada pencarian teks pada kolom identitas
* [ ] Filter sesuai dimensi data (status/tanggal/departemen)
* [ ] Penyaringan dikerjakan server
* [ ] Filter aktif terlihat & bisa dibersihkan sekaligus

---

# 25. Bahasa Produk

Antarmuka memakai kata yang **dimengerti pengguna**, bukan istilah teknis.

## 25.1 Aturan

* **Nama field database ≠ label layar.** `progress_status` menjadi "Status".
* **Hindari jargon:**
  * ~~Submit~~ → **Kirim**
  * ~~Delete~~ → **Hapus**
  * ~~Update~~ → **Perbarui**
  * ~~Cancel~~ → **Batal**
  * ~~Approve~~ → **Setujui**
  * ~~Draft~~ → **Draf**
* **Satu istilah untuk satu hal** di seluruh aplikasi.
* **Pesan menjelaskan akibat, bukan mekanisme.** "Laporan berhasil dikirim" bukan "Report submitted successfully".

## 25.2 Checklist

* [ ] Tidak ada nama kolom database bocor jadi label layar
* [ ] Istilah konsisten lintas layar, pesan, dan export
* [ ] Semua user-facing text dalam Bahasa Indonesia

---

# 26. Format Tanggal & Waktu: Indonesia

## 26.1 Aturan

* **Tanggal**: hari, nama bulan **panjang**, tahun — "30 Juli 2026". Bukan `07/30/2026`.
* **Waktu**: **24 jam**, pemisah titik — "08.15", bukan "8:15 AM".
* **Gabungan**: "30 Juli 2026, 08.15 WIB"
* **Frontend lewat helper** `lib/format.ts` — jangan panggil `toLocaleDateString` langsung.
* **Backend lewat Carbon** `translatedFormat` dengan locale `id`.

**Dikecualikan** (tetap teknis):
* Nama berkas: `Ymd`, `Ymd-His`
* Payload API: ISO 8601
* Kunci data: `Y-m`

## 26.2 Checklist

* [ ] Tanggal tampil sebagai "DD NamaBulan YYYY", bulan Bahasa Indonesia
* [ ] Waktu 24 jam dengan pemisah titik; tak ada AM/PM
* [ ] Frontend memakai helper, bukan format langsung

---

# 27. Attachment Upload

## 27.1 Standar Upload

Halaman buat laporan menyediakan area upload dengan pola:

```text
┌────────────────────────────────────────┐
│                                        │
│        📁 Seret file ke sini           │
│        atau klik untuk upload          │
│                                        │
│     Maks. 10MB per file (JPG,PNG,PDF)  │
│                                        │
└────────────────────────────────────────┘

[📎 foto_oven.jpg (2.4MB) ✕]
```

Aturan:

* Drag & drop area dengan border dashed
* Validasi ukuran dan tipe file di frontend dan backend
* Chip file yang sudah diupload dengan opsi hapus
* Tampilkan progress upload jika file besar

---

# 28. Design North Star

DAMS harus memiliki karakter visual:

> **Clean, Functional, Professional, Light, and Efficient.**

Bukan:

> **Colorful, Oversized, Card-Heavy, AI-Generated SaaS Template.**

---

# 29. Final UI/UX Direction

```text
DAMS UI
│
├── Clean & Light
│
├── Horizontal Top Navigation
│
├── Information Dense
│
├── Clear Hierarchy
│
├── Minimal Description
│
├── Export Preview-First
│
├── Card-based Monitoring
│
├── Consistent Badge Status
│
├── Indonesian User-Facing Language
│
├── No Technical Error Exposure
│
└── No AI-Slop Visual Pattern
```

---

# 30. Mandatory Standard

Semua halaman dalam DAMS wajib mengikuti standar berikut:

> **Navigasi menggunakan Horizontal Top Navigation Bar.**
>
> **Dashboard menampilkan kartu statistik + grafik departemen + timeline terbaru.**
>
> **Frontend menggunakan compact enterprise UI.**
>
> **Input form tidak boleh terlalu besar dan tidak menggunakan background abu-abu sebagai default.**
>
> **Skala visual aplikasi berada pada rentang compact dengan baseline sekitar 12-14px untuk body text.**
>
> **Deskripsi hanya digunakan jika benar-benar diperlukan.**
>
> **Export menggunakan flow preview-first — user melihat preview sebelum memilih format export.**
>
> **Seluruh UI harus dirancang secara intentional dan menghindari pola visual generik hasil AI.**
>
> **Tampilan harus konsisten dengan mockup yang sudah disetujui di folder mockup/UI UX Mockup/.**

---

# 31. Referensi Mockup

Semua implementasi UI wajib mengacu pada mockup yang sudah disetujui:

| Halaman | Path Mockup |
|---|---|
| Login | `mockup/UI UX Mockup/.../halaman_login_daily_activity_monitoring_system/` |
| Dashboard | `mockup/UI UX Mockup/.../dashboard_utama_dams/` |
| Buat Laporan | `mockup/UI UX Mockup/.../buat_laporan_harian_dams/` |
| Laporan Saya | `mockup/UI UX Mockup/.../laporan_saya_dams/` |
| Detail Laporan | `mockup/UI UX Mockup/.../detail_laporan_dams/` |
| Monitoring Tim | `mockup/UI UX Mockup/.../monitoring_tim_dams/` |
| Preview & Export | `mockup/UI UX Mockup/.../preview_export_laporan_dams/` |
| Manajemen User | `mockup/UI UX Mockup/.../manajemen_pengguna_dams/` |
| Manajemen Departemen | `mockup/UI UX Mockup/.../manajemen_departemen_dams/` |
| Profil Saya | `mockup/UI UX Mockup/.../profil_saya_dams/` |

Setiap mockup berisi:
* `screen.png` — screenshot tampilan
* `code.html` — kode HTML referensi

Implementasi harus mencocokkan layout, warna, spacing, dan interaksi dari mockup. Deviasi dari mockup memerlukan justifikasi dan persetujuan.
