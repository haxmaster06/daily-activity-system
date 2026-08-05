# Standar Library UI DAMS

Dokumen khusus library antarmuka: apa yang dipakai, untuk apa, dan mengapa.
Aturan perilaku antarmukanya sendiri — input, tab, wizard, animasi, navigasi,
tabel — ada di `docs/standar-ui-ux.md`.

---

## 1. Aturan pokok

> **Seluruh komponen UI defaultnya memakai Radix UI atau React Aria.**

Keduanya *headless*: menyediakan perilaku, manajemen fokus, dan aksesibilitas,
tanpa membawa gaya sendiri. Gayanya seluruhnya milik kita lewat Tailwind,
sehingga tidak ada tema pihak ketiga yang harus dilawan setiap kali menyimpang
dari tampilan bawaannya.

---

## 2. Peta komponen

| Komponen | Library | Berkas |
|---|---|---|
| Dialog / Modal | **React Aria** | `ui/modal.tsx` |
| Drawer (menu mobile) | **React Aria** | `layout/staggered-menu.tsx` |
| Date Picker | **React Aria** | `ui/date-picker.tsx` |
| Calendar | **React Aria** | menyatu di `ui/date-picker.tsx` |
| Combo Box | **React Aria** | `ui/combobox.tsx` |
| Select | **Radix** | `ui/select.tsx` |
| Dropdown Menu | **Radix** | `layout/app-header.tsx` |
| Hover Card | **Radix** | `ui/hover-card.tsx` |
| Navigation Menu | **Radix** | `layout/app-header.tsx` |
| Button Group | **Radix** ToggleGroup | `ui/button-group.tsx` |
| Tooltip | **Radix** | sesuai kebutuhan |
| Command | **cmdk** | `ui/command.tsx` |
| Field | pola shadcn | `ui/field.tsx` |
| Button | pola shadcn (CVA) | `ui/button.tsx` |
| Table | HTML semantik | `ui/data-table.tsx` |
| Animasi | **motion** | `lib/gerak.ts` |

---

## 3. Kapan Radix, kapan React Aria

Keduanya sama-sama sah. Pembagiannya:

**React Aria** untuk komponen yang mengatur **fokus dan input rumit**:
dialog, drawer, date picker, calendar, combobox. Manajemen fokus, pembacaan
tanggal per segmen, dan penyaringan ketik miliknya lebih matang.

**Radix** untuk komponen **popup dan pilihan** yang lebih sederhana: select,
dropdown, hover card, tooltip, toggle group, navigation menu. API-nya lebih
ringkas dan sudah dipakai sejak M0.

Bila sebuah komponen ada di keduanya, ikuti tabel §2. Jangan membuat versi
kedua dari komponen yang sama dengan library berbeda.

---

## 4. Empat komponen yang librarynya tidak sesuai permintaan awal

Arahan awal menyebut Radix untuk Command, Combo Box, Calendar, dan Table.
Radix tidak menyediakan keempatnya. Penggantinya:

| Diminta | Kenyataan | Dipakai |
|---|---|---|
| Command → Radix | Radix tidak punya komponen Command | **cmdk** — pustaka yang juga dipakai shadcn untuk ini |
| Combo Box → Radix | Radix `Select` tidak punya penyaringan ketik, sehingga bukan combobox | **React Aria ComboBox** |
| Calendar → Radix | Radix tidak punya komponen Calendar | **React Aria Calendar** |
| Table → Radix | Radix tidak punya komponen Table | `<table>` semantik + Tailwind |

Catatan Table: tabel HTML yang benar sudah aksesibel tanpa bantuan library.
Bila nanti butuh sortir multi-kolom, pin kolom, atau virtualisasi, yang
ditambahkan adalah **TanStack Table** — headless, hanya logika, tanpa markup.

---

## 5. shadcn/ui

shadcn **bukan dependensi**. Kodenya disalin ke `src/components/ui/` lalu
disesuaikan token DAMS. Isinya memang Radix + CVA + Tailwind, sehingga tetap
sejalan dengan aturan pokok §1.

Yang diambil dari shadcn:

* Pola `Button` — varian lewat `class-variance-authority`, `asChild` lewat
  Radix Slot
* Pola `Field` — pembungkus label, isian, teks bantuan, dan pesan galat, dengan
  `aria-describedby` yang tersambung
* Susunan `Table`

Yang **tidak** diambil: warna, radius, dan skala huruf bawaan shadcn. Semuanya
diganti token DAMS di `tailwind.config.ts`.

---

## 6. React Bits

Efek gerak. Disalin manual, warnanya diganti token DAMS, durasinya disesuaikan
`docs/standar-ui-ux.md` §5.2.

| Kebutuhan | Komponen | Berkas |
|---|---|---|
| Visualisasi langkah | Stepper | `ui/stepper.tsx` |
| Menu samping | Staggered Menu | `layout/staggered-menu.tsx` |
| Daftar menu | Animated List | `ui/daftar-muncul.tsx` |
| Tab | Pill Nav | `ui/pill-nav.tsx` |
| Tombol kirim / masuk | Spectacular Button | `ui/spectacular-button.tsx` |
| Kartu | Border Glow | `ui/border-glow-card.tsx` |
| Navigasi bawah (mobile) | Dock | `layout/dock.tsx` |
| Angka statistik | Count Up | `ui/angka-hidup.tsx` |

Penyesuaian yang diambil, beserta alasannya:

* **Staggered Menu bukan permanent sidebar.** Standarisasi §2.1 melarang
  sidebar tetap. Dipakai sebagai drawer yang muncul saat diminta lalu tertutup
  lagi, dan hanya di bawah breakpoint `md`.
* **Dock tidak membesar berantai** ala macOS. Pada aplikasi kerja, ikon yang
  ikut membesar saat kursor lewat menyulitkan sasaran sentuh. Hanya ikon aktif
  yang membesar tipis.
* **Border Glow hanya pada kartu yang dapat diklik.** Glow yang menyala terus
  melanggar aturan "elemen yang tidak berinteraksi tidak bergerak sendiri".
* **Spectacular Button paling banyak satu per layar.** Tombol sekunder, Batal,
  dan ikon aksi pada tabel memakai `Button` biasa.
* **Count Up hanya di kartu statistik.** Angka di dalam tabel tidak
  beranimasi — gerakan di sana mengganggu pembacaan data.

**Yang dilarang dari React Bits:** latar partikel, teks berkilau, kursor
kustom, kartu 3D miring, dan efek dekoratif lain yang tidak menyampaikan
informasi. Standarisasi §9–§10 tetap berlaku.

---

## 7. MUI — tidak dipakai

MUI sempat dipakai pada M2b untuk Stepper, Tabs, Autocomplete, dan DatePicker.

| Komponen | Dulu | Sekarang |
|---|---|---|
| Stepper | MUI | React Bits |
| Tabs | MUI | Pill Nav (React Bits) |
| Autocomplete | MUI | React Aria ComboBox |
| DatePicker | MUI | React Aria DatePicker |

Setelah keempatnya pindah, daftar tugas MUI kosong. MUI dan Emotion dicopot —
**36 paket** keluar dari `node_modules`.

Secara teknis MUI **bisa** berdampingan dengan Radix dan React Aria; sempat
berjalan tanpa konflik dengan gaya Emotion ditaruh di CSS layer terpisah.
Alasan mencopotnya bukan ketidakcocokan, melainkan: membawa runtime Emotion,
menuntut sistem tema kedua yang harus terus disamakan dengan token Tailwind,
dan menghadirkan komponen kembar (MUI punya Dialog, Select, dan Tabs sendiri)
yang mudah terpakai keliru.

**Satu-satunya alasan sah menambahkannya kembali:** `@mui/x-data-grid` —
virtualisasi, resize kolom, dan pin kolom, yang tidak ada padanannya di Radix
maupun React Aria. Bila itu terjadi, pemakaiannya dibatasi pada komponen
tersebut saja dan alasannya ditulis di sini.

---

## 8. Daftar dependensi UI

Runtime:

```
react-aria-components      perilaku dialog, date picker, combobox
@internationalized/date    tipe tanggal untuk React Aria
@radix-ui/react-*          13 paket — select, dropdown, hover-card,
                           navigation-menu, toggle-group, dialog,
                           popover, tooltip, label, checkbox,
                           separator, slot, tabs
@dnd-kit/core              tarik-lepas papan progres (§9.1)
@dnd-kit/sortable          penyusunan ulang kartu di dalam kolom
@dnd-kit/utilities         penolong transform CSS untuk @dnd-kit
chart.js                   grafik Executive Analytics (§9.2)
react-chartjs-2            pembungkus React untuk chart.js
motion                     animasi dan AnimatePresence
cmdk                       command palette
class-variance-authority   varian komponen
clsx + tailwind-merge      penggabungan className
lucide-react               ikon
sonner                     notifikasi toast
```

Build:

```
tailwindcss                token dan utility
tailwindcss-animate        keyframes bantuan
```

---

## 9. Menambah library baru

Sebelum menambah dependensi UI, jawab berurutan:

1. Apakah **Radix** menyediakannya?
2. Bila tidak, apakah **React Aria** menyediakannya?
3. Bila keduanya tidak, apakah komponennya cukup sederhana untuk ditulis
   sendiri di atas HTML semantik?

Library baru hanya masuk bila ketiganya dijawab "tidak". Alasannya wajib
ditulis di dokumen ini, seperti yang dilakukan untuk `cmdk` di §4.

Yang **tidak** menjadi alasan sah: "lebih cepat", "sudah biasa dipakai", atau
"komponennya lebih cantik". Menambah library UI berarti menambah satu lagi
sumber gaya yang harus dijaga konsisten seumur project.

### 9.1 `@dnd-kit` — tarik-lepas papan progres

Dipakai di `src/app/(app)/progress/`. Ini satu-satunya kasus sejauh ini yang
lolos §9 meskipun **React Aria menyediakan penggantinya**, jadi alasannya
ditulis panjang.

| Pertanyaan §9 | Jawaban |
|---|---|
| Radix punya? | Tidak. Radix tidak punya primitif tarik-lepas sama sekali. |
| React Aria punya? | **Ya** — `useDragAndDrop`, lengkap dengan pengoperasian papan ketik. |
| Cukup ditulis sendiri? | Tidak. Tarik-lepas menyentuh pointer capture, auto-scroll, sensor sentuh, dan pengumuman pembaca layar. |

Rencana awal memang memakai React Aria. Yang membatalkannya ditemukan saat
pemasangan: **React Aria tidak memiliki locale `id-ID`.**

```
node_modules/react-aria/dist/private/intl/dnd/   → 34 locale, tanpa id-ID
```

Akibatnya nyata, bukan teoretis. Seluruh petunjuk tarik-lepas React Aria
diucapkan lewat wilayah `aria-live` miliknya sendiri, dan tanpa kamus Indonesia
ia jatuh ke Inggris:

```
"dragDescriptionKeyboard": "Press Enter to start dragging."
"dragStartedKeyboard":     "Started dragging. Press Tab to navigate to a drop
                            target, then press Enter to drop..."
"dropComplete":            "Drop complete."
```

Kalimat itulah satu-satunya penjelasan yang diterima pengguna pembaca layar —
justru pengguna yang paling bergantung padanya. CLAUDE.md mewajibkan seluruh
teks yang dilihat, atau didengar, pengguna memakai Bahasa Indonesia.

`@dnd-kit` menyerahkan seluruh kalimatnya kepada pemanggil lewat
`accessibility={{ announcements, screenReaderInstructions }}`. Teksnya ada di
`papan-kanban.tsx` dan berbahasa Indonesia seluruhnya, dijaga oleh test
`papan-kanban.test.tsx`.

> **Koreksi.** Versi pertama catatan ini menyatakan React Aria tidak menyediakan
> jalan apa pun untuk mengganti kamus internalnya. Itu keliru: ada kamus global
> yang menang atas kamus bawaan, dan sekarang DAMS memakainya — lihat §9.3.
> Artinya tarik-lepas React Aria **kini layak dipertimbangkan ulang**, dan
> pilihan `@dnd-kit` berdiri di atas alasan yang lebih sempit: ia sudah
> terbangun, teruji, dan terbukti di peramban, sementara menggantinya kembali
> tidak menambah apa pun bagi pengguna. Bukan lagi karena tidak ada jalan lain.

### 9.2 `chart.js` — grafik Executive Analytics

Dipakai di `src/app/(app)/analitik/`.

| Pertanyaan §9 | Jawaban |
|---|---|
| Radix punya? | Tidak. Radix tidak menyediakan grafik. |
| React Aria punya? | Tidak. React Aria tidak menyediakan grafik. |
| Cukup ditulis sendiri? | Tidak. Menulis sendiri berarti menulis ulang sumbu, legenda, tooltip, tumpukan, dan responsivitas — dan semuanya harus benar sebelum satu angka pun terbaca. |

#### Konsekuensi yang wajib ditangani, bukan dicatat lalu dilupakan

Chart.js menggambar ke `<canvas>`. **Seluruh grafik hanya satu elemen DOM**:
tidak ada satu pun titik data yang dapat difokus papan ketik, dan pembaca layar
tidak menemukan apa pun di dalamnya selain kotak kosong.

`docs/standar-ui-ux.md` §1 menempatkan aksesibilitas sebagai syarat kelulusan.
Karena itu berlaku aturan berikut, dan aturan ini mengikat setiap grafik yang
ditambahkan kemudian:

1. **Tiap grafik wajib disertai tabel berisi angka yang sama.** Bukan
   pelengkap — itu satu-satunya jalan isi grafik sampai ke pembacanya.
2. **Tabelnya tidak boleh dilipat.** Rencana semula membolehkannya asalkan
   tetap ada di DOM. Itu keliru: isi yang dilipat berakhir `display: none` dan
   lenyap dari pohon aksesibilitas, persis hal yang hendak dihindari. Tabelnya
   selalu tampil, berdampingan dengan grafiknya pada layar lebar.
3. **Kanvasnya diberi `aria-hidden`.** Angkanya sudah dibacakan tabel;
   membiarkan kanvas ikut terbaca hanya menyisipkan simpul kosong.
4. **Apa pun yang dapat diklik pada grafik wajib punya jalan kedua di
   tabelnya.** Kanvas tidak dapat difokus papan ketik sama sekali, sehingga
   "klik batang untuk melihat rincian" berarti rincian itu tertutup bagi
   pengguna papan ketik. Di `/analitik`, nama departemen pada tabel adalah
   tombol yang membuka rincian yang sama.

Keempatnya dijaga `papan-analitik.test.tsx`, yang menolak panel bergrafik tanpa
tabel dan menyebut grafik mana yang melanggarnya.

Warna grafik ditulis sebagai nilai hex di `lib/analitik.ts`, bukan kelas
Tailwind — kanvas tidak pernah membaca CSS. Nilainya wajib sama dengan
`tailwind.config.ts`: status yang berbeda warna antara badge dan grafik membuat
pembacanya mengira keduanya hal yang berlainan.

---

#### Yang tetap disediakan meski memakai library tarik-lepas

Tiap kartu punya menu **"Pindahkan ke <kolom>"**. Bukan pelengkap, dan bukan
karena tarik-lepasnya kurang: menyeret dengan papan ketik menuntut pengguna
menahan model posisi di kepalanya, sedangkan menu menyebut kolom tujuannya
dengan kata dan cukup satu penekanan. Jalur itu juga yang membuat perpindahan
kartu dapat diuji tanpa tata letak — jsdom tidak punya ukuran elemen, sehingga
sensor papan ketik `@dnd-kit` tidak dapat menghitung arah di dalam test.

---

### 9.3 Kamus Bahasa Indonesia untuk React Aria

`src/lib/react-aria-bahasa.ts`. Bukan library baru — kamus milik sendiri yang
menambal lubang bahasa di library yang sudah dipakai.

React Aria menyertakan 34 locale dan **`id-ID` bukan salah satunya**. Sebagian
teks yang dibangkitkannya tidak dapat dijangkau lewat prop apa pun. Yang
terbukti muncul di DAMS, diperiksa langsung di peramban sebelum kamus ini ada:

| Teks | Asal | Terlihat di |
|---|---|---|
| `Dismiss` | `@react-aria/overlays` | tombol tersembunyi di tiap Popover |
| `Next` | `@react-aria/calendar` | tombol internal kalender |
| `Today, …, selected, Last available date` | `@react-aria/calendar` | tiap sel tanggal |

Sisanya sudah Bahasa Indonesia karena komponen kita mengisi `aria-label`-nya
sendiri — itu sebabnya kebocorannya hanya tiga, bukan puluhan.

**Cara kerjanya.** `LocalizedStringDictionary.getGlobalDictionaryForPackage()`
memeriksa dua simbol global lebih dulu; bila ada, kamus global menang atas kamus
bawaan. Jalur yang sama dipakai React Spectrum untuk menyuntikkan terjemahan.

**Dua jebakannya, dan keduanya berbahaya:**

1. Begitu simbol global terisi, paket yang **tidak terdaftar melempar galat** —
   bukan jatuh ke bahasa Inggris. Karena itu seluruh 18 paket dicantumkan,
   termasuk yang belum dipakai satu komponen pun.
2. Kunci yang tidak ada **juga melempar galat**. Menaikkan versi React Aria yang
   menambah satu kunci saja dapat menjatuhkan halaman di hadapan pengguna.

Jebakan kedua ditutup `react-aria-bahasa.test.ts`: ia membaca kamus bawaan
React Aria langsung dari `node_modules` dan membandingkan kunci per paket.
Upgrade yang menambah kunci **menggagalkan test**, bukan menjatuhkan halaman.

Kamusnya dipasang saat modul `ui-provider.tsx` dimuat, bukan di dalam efek:
React Aria menghitung daftar paketnya sekali lalu menyimpannya selamanya, jadi
pemasangan yang terlambat tidak berpengaruh sama sekali.

Bila React Aria kelak menyertakan `id-ID`, kamus ini boleh dibuang — dan salah
satu test di berkas itu memang akan memberi tahu.

---

## 10. Checklist tinjau kode

* [ ] Komponen baru memakai Radix atau React Aria, sesuai peta §2
* [ ] Tidak ada komponen MUI
* [ ] Tidak ada `<select>`, `<dialog>`, atau dropdown yang ditulis tangan
      padahal sudah ada komponennya di `src/components/ui/`
* [ ] Warna, radius, tinggi kontrol, dan skala huruf memakai token Tailwind —
      bukan nilai mentah
* [ ] Komponen React Bits sudah disesuaikan token DAMS, bukan salinan mentah
* [ ] Animasi memakai nilai dari `lib/gerak.ts`
* [ ] Dependensi baru punya alasan tertulis di §9
* [ ] Grafik baru disertai tabel angka yang tidak dilipat, kanvasnya
      `aria-hidden`, dan tiap interaksinya punya jalan kedua di tabel (§9.2)
