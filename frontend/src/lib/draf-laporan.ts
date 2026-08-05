import type { NilaiBaris } from '@/lib/laporan';

/**
 * Draf laporan yang belum sempat dikirim.
 *
 * Mengisi laporan harian dapat memakan puluhan sel. Sebelum ini tidak ada
 * apa pun yang melindunginya: tab tertutup, koneksi putus, atau sesi berakhir
 * berarti seluruh ketikan hilang tanpa jejak.
 *
 * Draf disimpan di peramban pengisi sendiri dan tidak pernah dikirim ke mana
 * pun selain API DAMS. Isinya memuat data laporan — nama supplier, nomor LOT,
 * angka produksi — karena itu dihapus begitu laporannya benar-benar tersimpan,
 * bukan dibiarkan menumpuk.
 *
 * Draf **ditawarkan**, tidak pernah dipulihkan diam-diam. Membuka halaman lalu
 * mendapati isian terisi sendiri membingungkan, dan pengisi mungkin memang
 * hendak memulai dari kosong.
 */

const AWALAN = 'dams-draf-laporan';

/** Draf lebih tua dari ini dianggap tidak relevan lagi. */
const UMUR_MAKSIMAL_HARI = 7;

export interface IsiDraf {
  tanggal: string | null;
  bagian: { templateId: number; baris: NilaiBaris[] }[];
  /** ISO 8601, dipakai membuang draf yang sudah basi. */
  disimpanPada: string;
}

/**
 * Kunci penyimpanan.
 *
 * Menyunting laporan yang sudah ada memakai kunci tersendiri supaya drafnya
 * tidak menimpa draf laporan baru yang mungkin sedang disusun bersamaan.
 */
export function kunciDraf(laporanId?: number): string {
  return laporanId === undefined ? `${AWALAN}-baru` : `${AWALAN}-ubah-${laporanId}`;
}

function tersedia(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage !== null;
  } catch {
    // Peramban dapat melarang localStorage lewat pengaturan privasi. Kehilangan
    // draf jauh lebih ringan daripada halaman yang gagal dimuat.
    return false;
  }
}

export function simpanDraf(laporanId: number | undefined, isi: Omit<IsiDraf, 'disimpanPada'>): void {
  if (!tersedia()) return;

  try {
    window.localStorage.setItem(
      kunciDraf(laporanId),
      JSON.stringify({ ...isi, disimpanPada: new Date().toISOString() }),
    );
  } catch {
    // Kuota penuh. Diabaikan — draf adalah jaring pengaman, bukan sumber data.
  }
}

export function bacaDraf(laporanId?: number): IsiDraf | null {
  if (!tersedia()) return null;

  try {
    const mentah = window.localStorage.getItem(kunciDraf(laporanId));
    if (!mentah) return null;

    const draf = JSON.parse(mentah) as IsiDraf;

    if (!Array.isArray(draf.bagian) || typeof draf.disimpanPada !== 'string') {
      return null;
    }

    const umurHari = (Date.now() - new Date(draf.disimpanPada).getTime()) / 86_400_000;

    if (!Number.isFinite(umurHari) || umurHari > UMUR_MAKSIMAL_HARI) {
      hapusDraf(laporanId);

      return null;
    }

    return draf;
  } catch {
    // Draf rusak — dibuang, bukan dibiarkan menggagalkan halaman.
    hapusDraf(laporanId);

    return null;
  }
}

export function hapusDraf(laporanId?: number): void {
  if (!tersedia()) return;

  try {
    window.localStorage.removeItem(kunciDraf(laporanId));
  } catch {
    // Diabaikan dengan alasan yang sama seperti pada penyimpanan.
  }
}

/** Draf yang seluruh selnya kosong tidak perlu ditawarkan. */
export function drafBerisi(isi: Pick<IsiDraf, 'bagian'>): boolean {
  return isi.bagian.some((satu) =>
    satu.baris.some((baris) =>
      Object.values(baris).some(
        (nilai) => nilai !== null && nilai !== '' && nilai !== false && nilai !== undefined,
      ),
    ),
  );
}
