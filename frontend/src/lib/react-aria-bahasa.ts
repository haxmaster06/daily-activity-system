/**
 * Kamus Bahasa Indonesia untuk teks bawaan React Aria.
 *
 * ## Mengapa berkas ini ada
 *
 * React Aria menyertakan 34 locale, dan **`id-ID` bukan salah satunya**:
 *
 * ```
 * node_modules/react-aria/dist/private/intl/*   → ar-AE … zh-TW, tanpa id-ID
 * ```
 *
 * Tanpa kamus ini, komponen React Aria jatuh ke bahasa Inggris untuk teks yang
 * dibangkitkannya sendiri — dan sebagian teks itu tidak dapat dijangkau lewat
 * prop apa pun. Yang benar-benar terbukti muncul di DAMS, diperiksa langsung di
 * peramban:
 *
 * | Teks | Asal | Terlihat di |
 * |---|---|---|
 * | `Dismiss` | `@react-aria/overlays` | tombol tersembunyi di tiap Popover |
 * | `Next` | `@react-aria/calendar` | tombol internal kalender |
 * | `Today, …, selected, Last available date` | `@react-aria/calendar` | tiap sel tanggal |
 *
 * CLAUDE.md mewajibkan seluruh teks yang sampai ke pengguna memakai Bahasa
 * Indonesia — dan teks di atas justru satu-satunya yang didengar pengguna
 * pembaca layar.
 *
 * ## Cara kerjanya
 *
 * `LocalizedStringDictionary.getGlobalDictionaryForPackage()` memeriksa dua
 * simbol global lebih dulu, dan bila ada, kamus global itu **menang** atas
 * kamus bawaan. Itu jalan resmi yang dipakai React Spectrum sendiri untuk
 * menyuntikkan terjemahan.
 *
 * ## ⚠️ Dua jebakan yang membuat berkas ini harus lengkap
 *
 * Keduanya terbaca langsung dari sumber `@internationalized/string`:
 *
 * 1. Begitu simbol global terisi, **paket yang tidak terdaftar melempar galat**
 *    — bukan jatuh kembali ke bahasa Inggris. Karena itu seluruh 18 paket
 *    dicantumkan, termasuk yang belum dipakai satu komponen pun.
 * 2. **Kunci yang tidak ada juga melempar galat.** Menaikkan versi React Aria
 *    yang menambah kunci baru akan membuat halaman gagal dirender.
 *
 * Jebakan kedua ditutup `react-aria-bahasa.test.ts`, yang membandingkan kunci
 * di berkas ini dengan kunci bawaan React Aria untuk tiap paket. Upgrade yang
 * menambah kunci akan **menggagalkan test**, bukan menjatuhkan halaman di
 * hadapan pengguna.
 */

type Formatter = {
  plural: (
    count: number,
    options: Record<string, string | (() => string)>,
    type?: string,
  ) => string;
  number: (value: number) => string;
  select: (options: Record<string, string | (() => string)>, value: unknown) => string;
};

type Pesan = string | ((args: Record<string, never>, formatter: Formatter) => string);

/** Simbol yang dibaca `LocalizedStringDictionary.getGlobalDictionaryForPackage`. */
export const SIMBOL_LOCALE = Symbol.for('react-aria.i18n.locale');

export const SIMBOL_KAMUS = Symbol.for('react-aria.i18n.strings');

export const LOCALE = 'id-ID';

/* eslint-disable @typescript-eslint/no-explicit-any */
const args = (fn: (a: any, f: Formatter) => string): Pesan => fn as unknown as Pesan;
/* eslint-enable @typescript-eslint/no-explicit-any */

export const KAMUS_REACT_ARIA: Record<string, Record<string, Pesan>> = {
  '@react-aria/autocomplete': {
    collectionLabel: 'Saran',
  },

  '@react-aria/breadcrumbs': {
    breadcrumbs: 'Remah roti',
  },

  '@react-aria/calendar': {
    previous: 'Sebelumnya',
    next: 'Berikutnya',
    selectedDateDescription: args((a) => `Tanggal terpilih: ${a.date}`),
    selectedRangeDescription: args((a) => `Rentang terpilih: ${a.dateRange}`),
    todayDate: args((a) => `Hari ini, ${a.date}`),
    todayDateSelected: args((a) => `Hari ini, ${a.date}, terpilih`),
    dateSelected: args((a) => `${a.date}, terpilih`),
    startRangeSelectionPrompt: 'Pilih tanggal awal rentang',
    finishRangeSelectionPrompt: 'Pilih tanggal akhir rentang',
    minimumDate: 'Tanggal paling awal yang tersedia',
    maximumDate: 'Tanggal paling akhir yang tersedia',
    dateRange: args((a) => `${a.startDate} sampai ${a.endDate}`),
  },

  '@react-aria/color': {
    colorPicker: 'Pemilih warna',
    twoDimensionalSlider: 'Penggeser dua arah',
    colorNameAndValue: args((a) => `${a.name}: ${a.value}`),
    colorInputLabel: args((a) => `${a.label}, ${a.channelLabel}`),
    colorSwatch: 'contoh warna',
    transparent: 'bening',
  },

  '@react-aria/combobox': {
    focusAnnouncement: args(
      (a, f) =>
        `${f.select(
          {
            true: () =>
              `Masuk ke grup ${a.groupTitle}, berisi ${f.plural(a.groupCount, {
                other: () => `${f.number(a.groupCount)} pilihan`,
              })}. `,
            other: '',
          },
          a.isGroupChange,
        )}${a.optionText}${f.select({ true: ', terpilih', other: '' }, a.isSelected)}`,
    ),
    countAnnouncement: args(
      (a, f) =>
        `${f.plural(a.optionCount, {
          other: () => `${f.number(a.optionCount)} pilihan`,
        })} tersedia.`,
    ),
    selectedAnnouncement: args((a) => `${a.optionText}, terpilih`),
    buttonLabel: 'Tampilkan pilihan',
    listboxLabel: 'Pilihan',
  },

  '@react-aria/datepicker': {
    era: 'era',
    year: 'tahun',
    month: 'bulan',
    day: 'hari',
    hour: 'jam',
    minute: 'menit',
    second: 'detik',
    dayPeriod: 'pagi/siang',
    calendar: 'Kalender',
    startDate: 'Tanggal mulai',
    endDate: 'Tanggal selesai',
    weekday: 'hari dalam minggu',
    timeZoneName: 'zona waktu',
    selectedDateDescription: args((a) => `Tanggal terpilih: ${a.date}`),
    selectedRangeDescription: args((a) => `Rentang terpilih: ${a.startDate} sampai ${a.endDate}`),
    selectedTimeDescription: args((a) => `Waktu terpilih: ${a.time}`),
  },

  /*
   * Papan progres memakai `@dnd-kit`, bukan tarik-lepas React Aria — justru
   * karena teks ini tidak dapat diganti sebelum kamus global ada
   * (`docs/standar-library-ui.md` §9.1). Terjemahannya tetap disediakan supaya
   * komponen React Aria mana pun yang kelak memakai tarik-lepas tidak melempar
   * galat, dan supaya keputusan itu dapat ditinjau ulang kelak.
   */
  '@react-aria/dnd': {
    dragItem: args((a) => `Seret ${a.itemText}`),
    dragSelectedItems: args(
      (a, f) => `Seret ${f.plural(a.count, { other: () => `${f.number(a.count)} item terpilih` })}`,
    ),
    dragDescriptionKeyboard: 'Tekan Enter untuk mulai memindahkan.',
    dragDescriptionKeyboardAlt: 'Tekan Alt + Enter untuk mulai memindahkan.',
    dragDescriptionTouch: 'Ketuk dua kali untuk mulai memindahkan.',
    dragDescriptionVirtual: 'Klik untuk mulai memindahkan.',
    dragDescriptionLongPress: 'Tekan agak lama untuk mulai memindahkan.',
    dragSelectedKeyboard: args(
      (a, f) =>
        `Tekan Enter untuk memindahkan ${f.plural(a.count, {
          other: () => `${f.number(a.count)} item terpilih`,
        })}.`,
    ),
    dragSelectedKeyboardAlt: args(
      (a, f) =>
        `Tekan Alt + Enter untuk memindahkan ${f.plural(a.count, {
          other: () => `${f.number(a.count)} item terpilih`,
        })}.`,
    ),
    dragSelectedLongPress: args(
      (a, f) =>
        `Tekan agak lama untuk memindahkan ${f.plural(a.count, {
          other: () => `${f.number(a.count)} item terpilih`,
        })}.`,
    ),
    dragStartedKeyboard:
      'Mulai memindahkan. Tekan Tab untuk berpindah ke tujuan, lalu Enter untuk menjatuhkan, ' +
      'atau Escape untuk membatalkan.',
    dragStartedTouch: 'Mulai memindahkan. Pilih tujuannya, lalu ketuk dua kali untuk menjatuhkan.',
    dragStartedVirtual: 'Mulai memindahkan. Pilih tujuannya, lalu klik atau tekan Enter.',
    endDragKeyboard: 'Sedang dipindahkan. Tekan Enter untuk membatalkan.',
    endDragTouch: 'Sedang dipindahkan. Ketuk dua kali untuk membatalkan.',
    endDragVirtual: 'Sedang dipindahkan. Klik untuk membatalkan.',
    dropDescriptionKeyboard: 'Tekan Enter untuk menjatuhkan. Escape untuk membatalkan.',
    dropDescriptionTouch: 'Ketuk dua kali untuk menjatuhkan.',
    dropDescriptionVirtual: 'Klik untuk menjatuhkan.',
    dropCanceled: 'Perpindahan dibatalkan.',
    dropComplete: 'Perpindahan selesai.',
    dropIndicator: 'penanda tujuan',
    dropOnRoot: 'Jatuhkan di',
    dropOnItem: args((a) => `Jatuhkan di ${a.itemText}`),
    insertBefore: args((a) => `Sisipkan sebelum ${a.itemText}`),
    insertBetween: args((a) => `Sisipkan antara ${a.beforeItemText} dan ${a.afterItemText}`),
    insertAfter: args((a) => `Sisipkan setelah ${a.itemText}`),
  },

  '@react-aria/grid': {
    deselectedItem: args((a) => `${a.item} tidak terpilih.`),
    select: 'Pilih',
    selectedCount: args(
      (a, f) =>
        `${f.plural(a.count, {
          '=0': 'Tidak ada yang terpilih',
          other: () => `${f.number(a.count)} item terpilih`,
        })}.`,
    ),
    selectedAll: 'Seluruh item terpilih.',
    selectedItem: args((a) => `${a.item} terpilih.`),
    longPressToSelect: 'Tekan agak lama untuk masuk mode pemilihan.',
  },

  '@react-aria/menu': {
    longPressMessage: 'Tekan agak lama atau tekan Alt + Panah Bawah untuk membuka menu',
  },

  '@react-aria/numberfield': {
    decrease: args((a) => `Kurangi ${a.fieldLabel}`),
    increase: args((a) => `Tambah ${a.fieldLabel}`),
    numberField: 'Isian angka',
  },

  '@react-aria/overlays': {
    dismiss: 'Tutup',
  },

  '@react-aria/searchfield': {
    'Clear search': 'Kosongkan pencarian',
  },

  '@react-aria/spinbutton': {
    Empty: 'Kosong',
  },

  '@react-aria/steplist': {
    steplist: 'Daftar langkah',
  },

  '@react-aria/table': {
    select: 'Pilih',
    selectAll: 'Pilih semua',
    sortable: 'kolom dapat diurutkan',
    ascending: 'menaik',
    descending: 'menurun',
    ascendingSort: args((a) => `diurutkan menaik menurut kolom ${a.columnName}`),
    descendingSort: args((a) => `diurutkan menurun menurut kolom ${a.columnName}`),
    columnSize: args((a) => `${a.value} piksel`),
    resizerDescription: 'Tekan Enter untuk mengubah lebar',
    expand: 'Bentangkan',
    collapse: 'Lipat',
  },

  '@react-aria/tag': {
    removeDescription: 'Tekan Delete untuk menghapus.',
    removeButtonLabel: 'Hapus',
  },

  '@react-aria/toast': {
    close: 'Tutup',
    notifications: args(
      (a, f) =>
        `${f.plural(a.count, { other: () => `${f.number(a.count)} notifikasi` })}.`,
    ),
  },

  '@react-aria/tree': {
    expand: 'Bentangkan',
    collapse: 'Lipat',
  },
};

/**
 * Memasang kamus ke simbol global yang dibaca React Aria.
 *
 * Wajib dijalankan **sebelum** komponen React Aria pertama dirender: daftar
 * paketnya dihitung sekali lalu disimpan selamanya di dalam library, sehingga
 * pemasangan yang terlambat tidak berpengaruh sama sekali.
 *
 * Hanya di peramban. Di server, `getGlobalDictionaryForPackage` memang
 * mengembalikan null lebih dulu, dan teks React Aria yang terpengaruh hanya
 * muncul di dalam overlay yang baru dirender setelah hidrasi.
 */
export function pasangBahasaReactAria(): void {
  if (typeof window === 'undefined') return;

  const global = window as unknown as Record<symbol, unknown>;

  // Sekali saja. Memasang ulang tidak berpengaruh — daftarnya sudah di-cache —
  // dan hanya menambah pekerjaan pada tiap navigasi.
  if (global[SIMBOL_KAMUS]) return;

  global[SIMBOL_LOCALE] = LOCALE;
  global[SIMBOL_KAMUS] = KAMUS_REACT_ARIA;
}
