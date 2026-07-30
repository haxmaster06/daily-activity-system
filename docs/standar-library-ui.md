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
