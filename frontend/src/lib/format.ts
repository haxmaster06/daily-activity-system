/**
 * Pemformatan tanggal, waktu, dan angka untuk seluruh antarmuka DAMS.
 *
 * Aturan (standar §26):
 * - Tanggal  : "30 Juli 2026" — bukan 07/30/2026
 * - Waktu    : 24 jam, pemisah titik — "08.15" — bukan 8:15 AM
 * - Gabungan : "30 Juli 2026, 08.15 WIB"
 *
 * Seluruh komponen wajib memakai helper ini. Jangan memanggil
 * `toLocaleDateString` / `toLocaleTimeString` langsung di komponen.
 *
 * Dikecualikan dan tetap teknis: nama berkas (Ymd), payload API (ISO 8601),
 * kunci data (Y-m) — dilayani oleh `toApiDate` dan `toFileStamp`.
 */

const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

const NAMA_HARI = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

export type TanggalMasukan = Date | string | number | null | undefined;

function keDate(nilai: TanggalMasukan): Date | null {
  if (nilai === null || nilai === undefined || nilai === '') return null;
  const d = nilai instanceof Date ? nilai : new Date(nilai);
  return Number.isNaN(d.getTime()) ? null : d;
}

function duaDigit(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Zona waktu tunggal seluruh tampilan.
 *
 * Dipatok, bukan diwarisi dari runtime. `getHours()` dan kerabatnya membaca
 * zona waktu tempat kode itu kebetulan berjalan, dan pada aplikasi ini ada tiga
 * tempat yang berbeda-beda:
 *
 * | Tempat                  | Zona                                    |
 * |-------------------------|-----------------------------------------|
 * | Peramban pengguna       | zona sistem pengguna — biasanya WIB     |
 * | Server Next.js          | zona container — UTC                    |
 * | Test                    | apa pun isi TZ saat itu                 |
 *
 * Akibatnya halaman yang dirender di server menuliskan jam UTC lalu menempelkan
 * label "WIB" di belakangnya, meleset tujuh jam. Yang terjadi antara 00.00 dan
 * 07.00 WIB bahkan tertulis pada tanggal kemarin — dan karena angkanya tetap
 * masuk akal, tidak ada yang menyadarinya.
 *
 * Menyetel TZ container memperbaiki gejalanya di server, tetapi tidak pada
 * peramban seseorang yang jam sistemnya tidak WIB. Yang benar-benar menjaga
 * adalah pematokan di sini.
 */
const ZONA_TAMPILAN = 'Asia/Jakarta';

const BAGIAN_ZONA = new Intl.DateTimeFormat('en-US', {
  timeZone: ZONA_TAMPILAN,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

type BagianWaktu = {
  tahun: number;
  /** 0-11, sepadan dengan indeks `NAMA_BULAN`. */
  bulan: number;
  tanggal: number;
  /** 0-6, Minggu = 0, sepadan dengan indeks `NAMA_HARI`. */
  hari: number;
  jam: number;
  menit: number;
};

/** Memecah satu instan menjadi bagian-bagiannya menurut waktu Jakarta. */
function bagianWaktu(d: Date): BagianWaktu {
  const bagian: Record<string, string> = {};

  for (const { type, value } of BAGIAN_ZONA.formatToParts(d)) {
    if (type !== 'literal') bagian[type] = value;
  }

  const tahun = Number(bagian.year);
  const bulan = Number(bagian.month) - 1;
  const tanggal = Number(bagian.day);

  return {
    tahun,
    bulan,
    tanggal,
    /*
     * Nama hari dihitung sendiri dari tanggal Jakarta, bukan diminta ke Intl.
     * Bagian `weekday` keluar sebagai nama berbahasa Inggris yang harus
     * dipetakan balik ke indeks, dan pemetaan itu ikut berubah bila locale
     * runtime berubah. Aritmetika tanggal tidak.
     */
    hari: new Date(Date.UTC(tahun, bulan, tanggal)).getUTCDay(),
    // `hour12: false` menghasilkan "24" untuk tengah malam pada sebagian runtime.
    jam: Number(bagian.hour) % 24,
    menit: Number(bagian.minute),
  };
}

/** "30 Juli 2026" */
export function formatTanggal(nilai: TanggalMasukan, fallback = '—'): string {
  const d = keDate(nilai);
  if (!d) return fallback;
  const { tanggal, bulan, tahun } = bagianWaktu(d);
  return `${tanggal} ${NAMA_BULAN[bulan]} ${tahun}`;
}

/** "Kamis, 30 Juli 2026" */
export function formatTanggalLengkap(nilai: TanggalMasukan, fallback = '—'): string {
  const d = keDate(nilai);
  if (!d) return fallback;
  return `${NAMA_HARI[bagianWaktu(d).hari]}, ${formatTanggal(d)}`;
}

/** "30 Jul 2026" — untuk sel tabel yang padat */
export function formatTanggalRingkas(nilai: TanggalMasukan, fallback = '—'): string {
  const d = keDate(nilai);
  if (!d) return fallback;
  const { tanggal, bulan, tahun } = bagianWaktu(d);
  return `${tanggal} ${NAMA_BULAN[bulan].slice(0, 3)} ${tahun}`;
}

/** "08.15" — 24 jam, pemisah titik */
export function formatWaktu(nilai: TanggalMasukan, fallback = '—'): string {
  const d = keDate(nilai);
  if (!d) return fallback;
  const { jam, menit } = bagianWaktu(d);
  return `${duaDigit(jam)}.${duaDigit(menit)}`;
}

/** "30 Juli 2026, 08.15 WIB" */
export function formatTanggalWaktu(nilai: TanggalMasukan, fallback = '—'): string {
  const d = keDate(nilai);
  if (!d) return fallback;
  return `${formatTanggal(d)}, ${formatWaktu(d)} WIB`;
}

/** "Juli 2026" */
export function formatBulanTahun(nilai: TanggalMasukan, fallback = '—'): string {
  const d = keDate(nilai);
  if (!d) return fallback;
  const { bulan, tahun } = bagianWaktu(d);
  return `${NAMA_BULAN[bulan]} ${tahun}`;
}

/**
 * "YYYY-MM-DD" — untuk payload API dan atribut `value` pada `<input type="date">`.
 *
 * Dikecualikan dari Bahasa Indonesia, bukan dari zona waktunya: tanggal yang
 * meleset sehari di sini membuat laporan tersimpan pada hari yang bukan hari
 * kerjanya.
 */
export function toApiDate(nilai: TanggalMasukan): string {
  const d = keDate(nilai);
  if (!d) return '';
  const { tanggal, bulan, tahun } = bagianWaktu(d);
  return `${tahun}-${duaDigit(bulan + 1)}-${duaDigit(tanggal)}`;
}

/**
 * "YYYY-MM-DD" hari ini menurut waktu Jakarta.
 *
 * Menggantikan `new Date().toISOString().slice(0, 10)`, yang menghasilkan
 * tanggal UTC — dan antara 00.00 sampai 07.00 WIB itu tanggal KEMARIN. Dipakai
 * sebagai nilai awal maupun batas atas isian tanggal, akibatnya laporan pagi
 * hari terisi tanggal kemarin, lalu tanggal hari ini ditolak sebagai "belum
 * terjadi".
 */
export function hariIniApi(): string {
  return toApiDate(new Date());
}

/**
 * "YYYY-MM-DD" sekian hari dari suatu tanggal, dihitung dalam waktu Jakarta.
 *
 * Bilangan negatif berarti mundur. Penambahannya dilakukan pada tanggal
 * Jakarta, bukan pada instannya, sehingga jumlah hari yang diminta selalu sama
 * dengan jumlah hari yang didapat.
 */
export function geserHariApi(jumlahHari: number, dari: TanggalMasukan = new Date()): string {
  const d = keDate(dari) ?? new Date();
  const { tahun, bulan, tanggal } = bagianWaktu(d);
  const geser = new Date(Date.UTC(tahun, bulan, tanggal + jumlahHari));

  return `${geser.getUTCFullYear()}-${duaDigit(geser.getUTCMonth() + 1)}-${duaDigit(
    geser.getUTCDate(),
  )}`;
}

/** "YYYY-MM-01" — tanggal pertama bulan berjalan menurut waktu Jakarta. */
export function awalBulanApi(dari: TanggalMasukan = new Date()): string {
  const d = keDate(dari) ?? new Date();
  const { tahun, bulan } = bagianWaktu(d);

  return `${tahun}-${duaDigit(bulan + 1)}-01`;
}

/** "20260730-0815" — untuk nama berkas export. Sengaja tetap teknis. */
export function toFileStamp(nilai: TanggalMasukan = new Date()): string {
  const d = keDate(nilai) ?? new Date();
  const { tanggal, bulan, tahun, jam, menit } = bagianWaktu(d);
  return `${tahun}${duaDigit(bulan + 1)}${duaDigit(tanggal)}-${duaDigit(jam)}${duaDigit(menit)}`;
}

/** "1.234,5" — pemisah ribuan titik, desimal koma. */
export function formatAngka(nilai: number | string | null | undefined, desimal = 0): string {
  if (nilai === null || nilai === undefined || nilai === '') return '—';
  const n = typeof nilai === 'number' ? nilai : Number(nilai);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('id-ID', {
    minimumFractionDigits: desimal,
    maximumFractionDigits: desimal,
  });
}

/**
 * Kebalikan `formatAngka` — mengubah tulisan pengguna menjadi angka.
 *
 * Di sinilah data paling mudah rusak tanpa terlihat: salah menafsirkan `1.234`
 * membuat seribu dua ratus tiga puluh empat tersimpan sebagai 1,234, dan tidak
 * ada yang menyadarinya sampai rekapan bulanan terlihat janggal. Karena itu
 * aturannya ditulis lengkap di sini, bukan disebar sebagai tebakan:
 *
 * | Bentuk                       | Ditafsirkan             | Contoh                |
 * |------------------------------|-------------------------|-----------------------|
 * | ada koma dan titik           | pemisah paling kanan    | `1.234,5` -> 1234.5   |
 * |                              | adalah desimal          | `1,234.5` -> 1234.5   |
 * | hanya koma                   | koma adalah desimal     | `12,75`   -> 12.75    |
 * | satu titik, <=2 angka        | titik adalah desimal    | `12.75`   -> 12.75    |
 * | titik selain itu             | titik adalah ribuan     | `1.234`   -> 1234     |
 *
 * Titik dengan paling banyak dua angka di belakangnya diperlakukan sebagai
 * desimal karena papan angka mengetikkan titik, dan `12.75` yang dimaksudkan
 * sebagai dua belas koma tujuh lima jauh lebih sering daripada seribu dua ratus
 * tujuh puluh lima yang ditulis tanpa pemisah ribuan lain.
 *
 * Penjaga sesungguhnya bukan aturan ini, melainkan `InputAngka` yang menuliskan
 * kembali hasilnya begitu isian ditinggalkan — pengguna langsung melihat angka
 * mana yang dipahami sistem.
 */
export function parseAngka(teks: string | number | null | undefined): number | null {
  if (typeof teks === 'number') return Number.isFinite(teks) ? teks : null;
  if (teks === null || teks === undefined) return null;

  const bersih = teks.trim().replace(/\s/g, '');
  if (bersih === '') return null;

  const negatif = bersih.startsWith('-');
  const angka = bersih.replace(/^[+-]/, '');

  if (!/^[\d.,]+$/.test(angka)) return null;

  const titikTerakhir = angka.lastIndexOf('.');
  const komaTerakhir = angka.lastIndexOf(',');

  let pemisahDesimal = -1;

  if (titikTerakhir !== -1 && komaTerakhir !== -1) {
    pemisahDesimal = Math.max(titikTerakhir, komaTerakhir);
  } else if (komaTerakhir !== -1) {
    pemisahDesimal = komaTerakhir;
  } else if (titikTerakhir !== -1) {
    const jumlahTitik = (angka.match(/\./g) ?? []).length;
    const angkaDiBelakang = angka.length - titikTerakhir - 1;

    if (jumlahTitik === 1 && angkaDiBelakang <= 2 && angkaDiBelakang > 0) {
      pemisahDesimal = titikTerakhir;
    }
  }

  const bagianBulat =
    pemisahDesimal === -1
      ? angka.replace(/[.,]/g, '')
      : angka.slice(0, pemisahDesimal).replace(/[.,]/g, '');
  const bagianPecahan = pemisahDesimal === -1 ? '' : angka.slice(pemisahDesimal + 1);

  if (bagianBulat === '' && bagianPecahan === '') return null;

  const hasil = Number(`${bagianBulat || '0'}.${bagianPecahan || '0'}`);
  if (!Number.isFinite(hasil)) return null;

  return negatif ? -hasil : hasil;
}

/** "2,4 MB" — ukuran berkas lampiran. */
export function formatUkuranBerkas(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${formatAngka(kb, 0)} KB`;
  return `${formatAngka(kb / 1024, 1)} MB`;
}
