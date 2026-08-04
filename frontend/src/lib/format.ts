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

/** "30 Juli 2026" */
export function formatTanggal(nilai: TanggalMasukan, fallback = '—'): string {
  const d = keDate(nilai);
  if (!d) return fallback;
  return `${d.getDate()} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Kamis, 30 Juli 2026" */
export function formatTanggalLengkap(nilai: TanggalMasukan, fallback = '—'): string {
  const d = keDate(nilai);
  if (!d) return fallback;
  return `${NAMA_HARI[d.getDay()]}, ${formatTanggal(d)}`;
}

/** "30 Jul 2026" — untuk sel tabel yang padat */
export function formatTanggalRingkas(nilai: TanggalMasukan, fallback = '—'): string {
  const d = keDate(nilai);
  if (!d) return fallback;
  return `${d.getDate()} ${NAMA_BULAN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

/** "08.15" — 24 jam, pemisah titik */
export function formatWaktu(nilai: TanggalMasukan, fallback = '—'): string {
  const d = keDate(nilai);
  if (!d) return fallback;
  return `${duaDigit(d.getHours())}.${duaDigit(d.getMinutes())}`;
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
  return `${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** "YYYY-MM-DD" — untuk payload API dan atribut `value` pada `<input type="date">`. */
export function toApiDate(nilai: TanggalMasukan): string {
  const d = keDate(nilai);
  if (!d) return '';
  return `${d.getFullYear()}-${duaDigit(d.getMonth() + 1)}-${duaDigit(d.getDate())}`;
}

/** "20260730-0815" — untuk nama berkas export. Sengaja tetap teknis. */
export function toFileStamp(nilai: TanggalMasukan = new Date()): string {
  const d = keDate(nilai) ?? new Date();
  return `${d.getFullYear()}${duaDigit(d.getMonth() + 1)}${duaDigit(d.getDate())}-${duaDigit(
    d.getHours(),
  )}${duaDigit(d.getMinutes())}`;
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
